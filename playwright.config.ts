import { defineConfig, devices } from "@playwright/test";

const baseURL = process.env.BASE_URL ?? "https://aiqa.su";

export default defineConfig({
  testDir: "./tests",
  forbidOnly: !!process.env.CI,
  workers: process.env.CI ? 1 : undefined,
  retries: process.env.CI ? 1 : 0,
  timeout: 30_000,
  fullyParallel: false,
  reporter: [["list"], ["html", { open: process.env.CI ? "never" : "on-failure" }]],
  use: {
    baseURL,
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
    video: "retain-on-failure",
  },
  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
    },
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
        baseURL,
      },
    },
  ],
});
