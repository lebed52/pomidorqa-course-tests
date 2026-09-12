#!/usr/bin/env node

import { spawnSync } from "node:child_process";

let input;

try {
  input = JSON.parse(await readStdin());
} catch {
  deny(
    "Pre-push hook не смог прочитать входные данные Cursor.",
    "Pre-push hook failed to parse its input."
  );
}

const shellCommand = input.command ?? "";

if (!containsGitPush(shellCommand)) {
  respond({ permission: "allow" });
}

const lint = spawnSync("npm", ["run", "lint"], {
  cwd: process.cwd(),
  encoding: "utf8",
  timeout: 110_000,
});

const report = formatReport(lint);

if (lint.error || lint.status !== 0) {
  deny(
    `Push заблокирован: ESLint нашёл ошибки.\n\n${report}`,
    "Fix the ESLint errors reported by the pre-push hook before trying git push again."
  );
}

respond({
  permission: "ask",
  user_message: `ESLint прошёл успешно.\n\n${report}\n\nТочно выполнить git push?`,
  agent_message:
    "The pre-push lint gate passed. Wait for the user's explicit confirmation before pushing.",
});

function containsGitPush(command) {
  return /(?:^|[;&|]\s*)git(?:\s+(?:-[^\s]+)(?:\s+[^\s]+)?)*\s+push(?:\s|$)/.test(
    command
  );
}

function formatReport(result) {
  const output = [result.stdout, result.stderr]
    .filter(Boolean)
    .join("\n")
    .trim();

  if (result.error?.code === "ETIMEDOUT") {
    return "ESLint не завершился за 110 секунд.";
  }

  if (result.error) {
    return `Не удалось запустить ESLint: ${result.error.message}`;
  }

  return output || `npm run lint завершился с кодом ${result.status ?? "unknown"}.`;
}

async function readStdin() {
  const chunks = [];

  for await (const chunk of process.stdin) {
    chunks.push(chunk);
  }

  return Buffer.concat(chunks).toString("utf8");
}

function deny(userMessage, agentMessage) {
  respond({
    permission: "deny",
    user_message: userMessage,
    agent_message: agentMessage,
  });
}

function respond(payload) {
  process.stdout.write(`${JSON.stringify(payload)}\n`);
  process.exit(0);
}
