const REVIEWED_EXACT_PATHS = new Set([
  "eslint.config.mjs",
  "package.json",
  "playwright.config.ts",
]);

export const REVIEW_MARKER_PREFIX = "<!-- pomidorqa-ai-review:";

function sanitizeReviewText(value) {
  return value.trim().replaceAll("@", "@\u200b");
}

export function isHomeworkBranch(branch) {
  return /^hw\d+[a-z]?-[a-z0-9][a-z0-9._-]*$/i.test(branch);
}

export function parseHomeworkBranch(branch) {
  const match = branch.match(/^hw(\d+)[a-z]?-(.+)$/i);
  if (!match) return null;
  return { lesson: Number(match[1]), student: match[2] };
}

export function isReviewedPath(path) {
  return path.startsWith("tests/") || REVIEWED_EXACT_PATHS.has(path);
}

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

export function reviewMarker(headSha) {
  return `${REVIEW_MARKER_PREFIX}${headSha} -->`;
}

export function hasReviewForCommit(reviews, headSha) {
  const marker = reviewMarker(headSha);
  return reviews.some((review) => review.body?.includes(marker));
}
