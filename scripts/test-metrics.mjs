#!/usr/bin/env node
// Сводка метрик по JSON-отчёту Playwright.
//
//   npx playwright test --reporter=json,html
//   node scripts/test-metrics.mjs playwright-report/results.json
//
// Считает не только pass/fail: распределение по уровням пирамиды, длительность,
// самые медленные сценарии, повторы и ожидаемые падения (known defects), а также
// дисциплину набора — сколько E2E готовят данные через API и сколько файлов
// гарантируют cleanup. Метрики нужны, чтобы отчёт читался как инженерный
// документ, а не как зелёная галочка.

import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";

const reportPath = process.argv[2] ?? "playwright-report/results.json";
const testsDir = "tests";

function collectSpecs(suite, project, out) {
  const suiteProject = suite.title?.match(/^(unit|api|e2e)$/) ? suite.title : project;

  for (const spec of suite.specs ?? []) {
    for (const test of spec.tests ?? []) {
      const results = test.results ?? [];
      out.push({
        title: spec.title,
        file: spec.file,
        project: test.projectName || suiteProject || "unknown",
        status: test.status,
        expectedStatus: test.expectedStatus,
        duration: results.reduce((sum, r) => sum + (r.duration ?? 0), 0),
        attempts: results.length,
      });
    }
  }

  for (const child of suite.suites ?? []) {
    collectSpecs(child, suiteProject, out);
  }
}

function listSpecFiles(dir) {
  const files = [];
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const path = join(dir, entry.name);
    if (entry.isDirectory()) files.push(...listSpecFiles(path));
    else if (entry.name.endsWith(".spec.ts")) files.push(path);
  }
  return files;
}

function formatSeconds(ms) {
  return `${(ms / 1000).toFixed(1)} с`;
}

function table(rows) {
  const widths = rows[0].map((_, i) => Math.max(...rows.map((row) => String(row[i]).length)));
  return rows
    .map((row) => row.map((cell, i) => String(cell).padEnd(widths[i])).join("  "))
    .join("\n");
}

const report = JSON.parse(readFileSync(reportPath, "utf8"));
const tests = [];
for (const suite of report.suites ?? []) {
  collectSpecs(suite, null, tests);
}

if (tests.length === 0) {
  console.error(`В отчёте ${reportPath} не нашлось тестов`);
  process.exit(1);
}

const expectedFailures = tests.filter((t) => t.expectedStatus === "failed");
const unexpected = tests.filter((t) => t.status === "unexpected");
const flaky = tests.filter((t) => t.status === "flaky");
const skipped = tests.filter((t) => t.status === "skipped");
const retried = tests.filter((t) => t.attempts > 1);
const wallClock = report.stats?.duration ?? tests.reduce((sum, t) => sum + t.duration, 0);

const byProject = new Map();
for (const test of tests) {
  const bucket = byProject.get(test.project) ?? { count: 0, duration: 0 };
  bucket.count += 1;
  bucket.duration += test.duration;
  byProject.set(test.project, bucket);
}

const specFiles = listSpecFiles(testsDir);
const e2eFiles = specFiles.filter((file) => file.includes("/e2e/"));
const withApiArrange = e2eFiles.filter((file) =>
  readFileSync(file, "utf8").includes("registerUserViaApi")
);
const withCleanup = e2eFiles.filter((file) => {
  const source = readFileSync(file, "utf8");
  return source.includes("cleanupUsersViaApi") || source.includes("deleteUserViaApi");
});

const slowest = [...tests].sort((a, b) => b.duration - a.duration).slice(0, 5);

console.log("Метрики прогона\n");
console.log(
  table([
    ["Всего тестов", tests.length],
    ["Прошли как ожидалось", tests.length - unexpected.length - flaky.length - skipped.length],
    ["Ожидаемые падения (known defects)", expectedFailures.length],
    ["Непредвиденные падения", unexpected.length],
    ["Flaky (прошли с повтора)", flaky.length],
    ["Пропущены", skipped.length],
    ["Тестов с повторами", retried.length],
    ["Общее время прогона", formatSeconds(wallClock)],
  ])
);

console.log("\nПо уровням пирамиды\n");
console.log(
  table([
    ["Уровень", "Тестов", "Время"],
    ...[...byProject.entries()]
      .sort((a, b) => b[1].count - a[1].count)
      .map(([project, bucket]) => [project, bucket.count, formatSeconds(bucket.duration)]),
  ])
);

console.log("\nДисциплина E2E\n");
console.log(
  table([
    ["Файлов E2E", e2eFiles.length],
    ["Готовят данные через API", `${withApiArrange.length} из ${e2eFiles.length}`],
    ["Гарантируют cleanup", `${withCleanup.length} из ${e2eFiles.length}`],
  ])
);

console.log("\nСамые медленные сценарии\n");
console.log(
  table(slowest.map((test) => [formatSeconds(test.duration), test.project, test.title]))
);

if (unexpected.length > 0) {
  console.log("\nНепредвиденные падения\n");
  console.log(table(unexpected.map((test) => [test.project, test.file, test.title])));
}

process.exit(unexpected.length > 0 ? 1 : 0);
