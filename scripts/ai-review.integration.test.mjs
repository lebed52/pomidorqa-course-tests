import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { once } from "node:events";
import { createServer } from "node:http";
import test from "node:test";

test("runs generation and verification before building a dry-run review", async () => {
  const requests = [];
  let polzaCalls = 0;
  const headSha = "a".repeat(40);
  const baseSha = "b".repeat(40);
  const pull = {
    state: "open",
    draft: false,
    title: "hw14 cleanup",
    body: "Перенёс setup в API",
    user: { login: "student" },
    base: { ref: "main", repo: { default_branch: "main" } },
    head: { ref: "hw14-student", sha: headSha },
  };

  const server = createServer(async (request, response) => {
    const chunks = [];
    for await (const chunk of request) chunks.push(chunk);
    const body = chunks.length ? JSON.parse(Buffer.concat(chunks).toString()) : null;
    requests.push({ method: request.method, url: request.url, body });

    response.setHeader("Content-Type", "application/json");
    if (request.url === "/repos/test/repo/pulls/42") {
      response.end(JSON.stringify(pull));
      return;
    }
    if (request.url === "/repos/test/repo/pulls/42/reviews?per_page=100") {
      response.end("[]");
      return;
    }
    if (request.url === "/repos/test/repo/git/matching-refs/heads/hw13-") {
      response.end("[]");
      return;
    }
    if (request.url === "/repos/test/repo/pulls/42/commits?per_page=100") {
      response.end(
        JSON.stringify([
          {
            commit: { message: "hw14: cleanup" },
            parents: [{ sha: baseSha }],
          },
        ]),
      );
      return;
    }
    if (request.url === `/repos/test/repo/compare/${baseSha}...${headSha}`) {
      response.end(
        JSON.stringify({
          status: "ahead",
          ahead_by: 1,
          files: [
            {
              filename: "tests/e2e/example.spec.ts",
              status: "modified",
              patch: "@@ -1,1 +1,2 @@\n test('ok', async () => {});\n+test.only('bad', async () => {});",
            },
          ],
        }),
      );
      return;
    }
    if (request.url === "/chat/completions") {
      polzaCalls += 1;
      assert.deepEqual(body.reasoning, { type: "disabled" });
      if (polzaCalls === 1) {
        response.end(
          JSON.stringify({
            choices: [
              {
                message: {
                  content: JSON.stringify({
                    comments: [
                      {
                        path: "tests/e2e/example.spec.ts",
                        line: 2,
                        priority: "P1",
                        rule: "9",
                        title: "В репозитории оставлен test.only",
                        body: "Кодекс 9 запрещает .only: полный suite пропустит остальные тесты.",
                      },
                    ],
                  }),
                },
              },
            ],
            usage: { prompt_tokens: 100, completion_tokens: 50, cost_rub: 0.1 },
          }),
        );
        return;
      }
      response.end(
        JSON.stringify({
          choices: [
            {
              message: {
                content: JSON.stringify({
                  checks: [{ index: 0, valid: true, reason: "Нарушение видно прямо в diff." }],
                }),
              },
            },
          ],
          usage: { prompt_tokens: 50, completion_tokens: 20, cost_rub: 0.05 },
        }),
      );
      return;
    }

    response.statusCode = 404;
    response.end(JSON.stringify({ error: request.url }));
  });

  server.listen(0, "127.0.0.1");
  await once(server, "listening");
  const address = server.address();
  const origin = `http://127.0.0.1:${address.port}`;
  const child = spawn(process.execPath, ["scripts/ai-review.mjs", "--dry-run"], {
    cwd: process.cwd(),
    env: {
      ...process.env,
      AI_REVIEW_HEAD_SHA: headSha,
      AI_REVIEW_PR_NUMBER: "42",
      GITHUB_API_URL: origin,
      GITHUB_REPOSITORY: "test/repo",
      GITHUB_TOKEN: "test-token",
      POLZA_AI_API_KEY: "test-key",
      POLZA_AI_BASE_URL: origin,
    },
  });
  let stdout = "";
  let stderr = "";
  child.stdout.on("data", (chunk) => (stdout += chunk));
  child.stderr.on("data", (chunk) => (stderr += chunk));
  const [exitCode] = await once(child, "close");
  server.close();

  assert.equal(exitCode, 0, stderr);
  assert.equal(polzaCalls, 2);
  assert.match(stdout, /Вердикт: доработать/);
  assert.match(stdout, /В репозитории оставлен test\.only/);
  assert.equal(
    requests.some((request) => request.method === "POST" && request.url?.includes("/reviews")),
    false,
  );
});
