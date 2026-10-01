import { defineConfig, devices } from "@playwright/test";

const e2eUse = {
  baseURL: process.env.POMIDORQA_BASE_URL ?? "https://aiqa.su",
  trace: "on" as const,
  screenshot: "on" as const,
  video: "on" as const,
};

export default defineConfig({
  timeout: 30_000,
  fullyParallel: false,
  // В CI повторяем падение один раз, чтобы заметить флак; локально ошибка видна сразу.
  retries: process.env.CI ? 1 : 0,
  // Один CI-worker снижает конкуренцию за пользователей, слоты и бронирования на общем стенде.
  workers: process.env.CI ? 1 : undefined,
  // В CI пишем лог и HTML-artifact, но не пытаемся открыть браузерное окно на headless-runner.
  reporter: [["list"], ["html", { open: process.env.CI ? "never" : "on-failure" }]],
  projects: [
    {
      name: "unit",
      testDir: "./tests/unit",
      // без browser-контекста — тест общается только с чистой функцией
    },
    {
      name: "api",
      testDir: "./tests/api",
      // без browser-контекста — тест общается только по HTTP с локальным мок-сервером
    },
    {
      name: "e2e",
      testDir: "./tests/e2e",
      // Сквозной сценарий с несколькими аккаунтами на живом стенде не укладывается в общий лимит.
      timeout: 90_000,
      use: { ...devices["Desktop Chrome"], ...e2eUse },
    },
    {
      name: "e2e-safari",
      testDir: "./tests/e2e",
      timeout: 90_000,
      use: { ...devices["Desktop Safari"], ...e2eUse },
    },
    {
      name: "e2e-edge",
      testDir: "./tests/e2e",
      timeout: 90_000,
      use: { ...devices["Desktop Edge"], channel: "msedge", ...e2eUse },
    },
  ],
});
