import assert from "node:assert/strict";
import test from "node:test";

import {
  annotatePatch,
  buildReviewConclusion,
  hasReviewForCommit,
  isHomeworkBranch,
  isReviewedPath,
  parseHomeworkBranch,
  parseStructuredReview,
  reviewMarker,
  toGitHubComments,
} from "./ai-review-lib.mjs";

test("recognizes only homework branches", () => {
  assert.equal(isHomeworkBranch("hw14-student"), true);
  assert.equal(isHomeworkBranch("hw12a-asyakasimova"), true);
  assert.equal(isHomeworkBranch("feature/steal-secret"), false);
});

test("extracts lesson and student from a homework branch", () => {
  assert.deepEqual(parseHomeworkBranch("hw14-valeriagvg"), {
    lesson: 14,
    student: "valeriagvg",
  });
  assert.deepEqual(parseHomeworkBranch("hw12a-asyakasimova"), {
    lesson: 12,
    student: "asyakasimova",
  });
});

test("reviews tests and their configuration but ignores lockfiles", () => {
  assert.equal(isReviewedPath("tests/e2e/profile.spec.ts"), true);
  assert.equal(isReviewedPath("playwright.config.ts"), true);
  assert.equal(isReviewedPath("package-lock.json"), false);
});

test("annotates only added lines with right-side line numbers", () => {
  const patch = [
    "@@ -10,2 +10,3 @@",
    " const oldLine = true;",
    "-const removed = true;",
    "+const added = true;",
    "+const second = true;",
  ].join("\n");
  const result = annotatePatch(patch);

  assert.deepEqual([...result.addedLines], [11, 12]);
  assert.match(result.annotated, /\+11: const added = true;/);
});

test("filters comments that do not point to an added line", () => {
  const added = new Map([["tests/e2e/test.spec.ts", new Set([12])]]);
  const comments = toGitHubComments(
    [
      {
        path: "tests/e2e/test.spec.ts",
        line: 12,
        priority: "P2",
        rule: "12",
        title: "Нет cleanup",
        body: "Удалите аккаунт в finally.",
      },
      {
        path: "tests/e2e/test.spec.ts",
        line: 13,
        priority: "P2",
        rule: "12",
        title: "Выдуманная строка",
        body: "Не должна публиковаться.",
      },
      {
        path: "tests/e2e/test.spec.ts",
        line: 12,
        priority: "P3",
        rule: "4",
        title: "Спорный совет",
        body: "Это допустимо по кодексу и не является нарушением.",
      },
    ],
    added,
  );

  assert.equal(comments.length, 1);
  assert.equal(comments[0].line, 12);
});

test("requires a valid structured review", () => {
  assert.throws(() => parseStructuredReview("not json"), /невалидный JSON/);
  assert.deepEqual(parseStructuredReview(JSON.stringify({ comments: [] })), {
    comments: [],
  });
});

test("builds the overall verdict only from validated findings", () => {
  assert.match(buildReviewConclusion([]), /Вердикт: зачёт/);
  assert.match(
    buildReviewConclusion([
      { priority: "P2", rule: "12", title: "Нет cleanup" },
    ]),
    /Вердикт: доработать/,
  );
});

test("neutralizes GitHub mentions in generated review text", () => {
  const comments = toGitHubComments(
    [
      {
        path: "tests/e2e/test.spec.ts",
        line: 12,
        priority: "P2",
        rule: "12",
        title: "Позвать @team",
        body: "Не уведомляй @student автоматически.",
      },
    ],
    new Map([["tests/e2e/test.spec.ts", new Set([12])]]),
  );
  assert.doesNotMatch(comments[0].body, /@team|@student/);
});

test("detects an existing review for the same commit", () => {
  const sha = "abc123";
  assert.equal(hasReviewForCommit([{ body: reviewMarker(sha) }], sha), true);
  assert.equal(hasReviewForCommit([{ body: reviewMarker("def456") }], sha), false);
});
