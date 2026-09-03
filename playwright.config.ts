import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
  timeout: 30_000,
  expect: { timeout: 15_000 },
  fullyParallel: false,
  workers: process.env.CI ? 1 : undefined,
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
      use: {
        ...devices["Desktop Chrome"],
        baseURL: process.env.POMIDORQA_BASE_URL ?? "https://aiqa.su",
        trace: "retain-on-failure",
        screenshot: "only-on-failure",
        video: "retain-on-failure",
      },
    },
  ],
});
