// Чистые (без сети и окружения) функции ревьюера: разбор веток, фильтрация
// правил под урок, аннотация diff и валидация ответа модели. Их удобно тестировать.

// Файлы вне tests/, которые всё же ревьюим (конфиги проекта).
const REVIEWED_EXACT_PATHS = new Set([
  "eslint.config.mjs",
  "package.json",
  "playwright.config.ts",
]);

// С какого урока правило вообще начинает действовать.
// Правила 11 (API Arrange) и 12 (cleanup) требуем только с 14-го урока.
const RULE_FIRST_LESSON = new Map([
  ["11", 14],
  ["12", 14],
]);

// Невидимый маркер в теле review: по нему понимаем, что данный commit уже отревьюен.
export const REVIEW_MARKER_PREFIX = "<!-- pomidorqa-ai-review:";

// Защита от случайного пинга: превращаем @ в @<zero-width space>,
// чтобы текст модели не мог реально упомянуть (@mention) человека или команду.
function sanitizeReviewText(value) {
  return value.trim().replaceAll("@", "@\u200b");
}

// Ветка похожа на домашку: hw<номер>[буква]-<username>.
export function isHomeworkBranch(branch) {
  return /^hw\d+[a-z]?-[a-z0-9][a-z0-9._-]*$/i.test(branch);
}

// Достаём из имени ветки номер урока и логин студента.
export function parseHomeworkBranch(branch) {
  const match = branch.match(/^hw(\d+)[a-z]?-(.+)$/i);
  if (!match) return null;
  return { lesson: Number(match[1]), student: match[2] };
}

// Действует ли правило кодекса на этом уроке (по карте RULE_FIRST_LESSON).
export function isRuleApplicableToLesson(rule, lesson) {
  return lesson >= (RULE_FIRST_LESSON.get(String(rule)) || 1);
}

// Вырезает из CODEX.md / REVIEW.md разделы и пункты чеклиста, которые не относятся
// к текущему уроку. Так модель не придирается по правилам будущих уроков.
export function filterRulesForLesson(markdown, lesson, allowedRules = null) {
  let includeSection = true;
  const allowed = allowedRules ? new Set(allowedRules.map(String)) : null;
  const isAllowed = (rule) =>
    isRuleApplicableToLesson(rule, lesson) && (!allowed || allowed.has(String(rule)));

  return markdown
    .split("\n")
    .filter((line) => {
      const section = line.match(/^##\s+(\d+)\./);
      if (section) {
        includeSection = isAllowed(section[1]);
      }
      if (!includeSection) return false;

      const checklistItem = line.match(/^- \[ \] \*\*(\d+)\./);
      return !checklistItem || isAllowed(checklistItem[1]);
    })
    .join("\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

// Ревьюим только тесты и перечисленные конфиги; остальное игнорируем.
export function isReviewedPath(path) {
  return path.startsWith("tests/") || REVIEWED_EXACT_PATHS.has(path);
}

// Превращает git-патч в текст, где у каждой строки проставлен её номер в НОВОМ файле:
//   "+142: код" — добавленная строка, " 143: код" — контекст.
// Заодно собирает множество реально добавленных строк (addedLines): только на них
// модели потом разрешено оставлять inline-замечания.
export function annotatePatch(patch) {
  const addedLines = new Set();
  const annotated = [];
  let newLine = 0;

  for (const rawLine of patch.split("\n")) {
    const hunk = rawLine.match(/^@@ -\d+(?:,\d+)? \+(\d+)(?:,\d+)? @@/);
    if (hunk) {
      newLine = Number(hunk[1]);
      annotated.push(rawLine);
      continue;
    }

    if (rawLine.startsWith("+") && !rawLine.startsWith("+++")) {
      addedLines.add(newLine);
      annotated.push(`+${newLine}: ${rawLine.slice(1)}`);
      newLine += 1;
      continue;
    }

    if (rawLine.startsWith("-") && !rawLine.startsWith("---")) {
      continue;
    }

    if (!rawLine.startsWith("\\")) {
      annotated.push(` ${newLine}: ${rawLine.slice(1)}`);
      newLine += 1;
    }
  }

  return { annotated: annotated.join("\n"), addedLines };
}

// Разбирает JSON-ответ модели и проверяет базовую форму: это объект с массивом
// comments не длиннее 5. Иначе — ошибка (лучше упасть, чем опубликовать мусор).
export function parseStructuredReview(content) {
  if (typeof content !== "string" || !content.trim()) {
    throw new Error("Модель вернула пустой ответ.");
  }

  let review;
  try {
    review = JSON.parse(content);
  } catch (error) {
    throw new Error(`Модель вернула невалидный JSON: ${error.message}`);
  }

  if (!review || typeof review !== "object") {
    throw new Error("Модель вернула не объект review.");
  }
  if (!Array.isArray(review.comments) || review.comments.length > 5) {
    throw new Error("Модель вернула недопустимый список комментариев.");
  }

  return review;
}

// Итоговый вердикт собирает КОД, а не модель: если есть P1/P2 — «доработать»,
// иначе «зачёт». Свободный пересказ модели в общий вывод не попадает.
export function buildReviewConclusion(comments) {
  if (!comments.length) {
    return "**Вердикт: зачёт.** CI завершился успешно. Доказуемых нарушений CODEX.md в добавленных строках текущей домашней работы не найдено.";
  }

  const needsWork = comments.some((comment) =>
    ["P1", "P2"].includes(comment.priority),
  );
  const verdict = needsWork ? "доработать" : "зачёт";
  const findings = comments
    .map((comment) => `- Кодекс ${comment.rule}: ${sanitizeReviewText(comment.title)}`)
    .join("\n");

  return `**Вердикт: ${verdict}.** CI завершился успешно. Найдено замечаний: ${comments.length}.\n\n${findings}`;
}

// Последний код-фильтр перед публикацией: пропускаем только замечания с валидными
// координатами (путь+строка реально в diff), приоритетом, номером правила и текстом.
// Комментарии, которые сами себя отрицают («не является нарушением», «это допустимо»),
// отбрасываем. Возвращаем готовые для GitHub inline-объекты.
export function toGitHubComments(comments, addedLinesByPath) {
  const priorities = new Set(["P1", "P2", "P3"]);
  const selfNegating =
    /(?:не является нарушением|это (?:нормально|допустимо)|по кодексу .* допустимо|замечание не заводится)/i;

  return comments.flatMap((comment) => {
    const line = Number(comment?.line);
    const valid =
      comment &&
      typeof comment.path === "string" &&
      addedLinesByPath.get(comment.path)?.has(line) &&
      priorities.has(comment.priority) &&
      /^\d{1,2}$/.test(String(comment.rule)) &&
      typeof comment.title === "string" &&
      comment.title.trim() &&
      typeof comment.body === "string" &&
      comment.body.trim() &&
      !selfNegating.test(`${comment.title} ${comment.body}`);

    if (!valid) return [];

    return [
      {
        path: comment.path,
        line,
        side: "RIGHT",
        body: `**${comment.priority}: ${sanitizeReviewText(comment.title)}** · Кодекс ${comment.rule}\n\n${sanitizeReviewText(comment.body)}`,
      },
    ];
  });
}

// Строит скрытый HTML-маркер с sha коммита для тела review.
export function reviewMarker(headSha) {
  return `${REVIEW_MARKER_PREFIX}${headSha} -->`;
}

// Уже был ли review именно для этого коммита? (Ищем маркер в прошлых review.)
// Защита от повторного вызова модели на тот же commit.
export function hasReviewForCommit(reviews, headSha) {
  const marker = reviewMarker(headSha);
  return reviews.some((review) => review.body?.includes(marker));
}
