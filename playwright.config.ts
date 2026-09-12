import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
  timeout: 30_000,
  fullyParallel: false,
  reporter: [["list"], ["html", { open: "on-failure" }]],
  projects: [
    {
      name: "unit",
      testDir: "./tests/unit",
    },
    {
      name: "api",
      testDir: "./tests/api",
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
