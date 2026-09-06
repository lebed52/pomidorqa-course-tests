import { defineConfig, devices } from "@playwright/test";

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
      use: {
        ...devices["Desktop Chrome"],
        // ИСПРАВЛЕНО: без actionTimeout любой click()/fill() ждёт до конца
        // ВСЕГО теста (test.setTimeout), а не до разумного предела — падение
        // из-за пропавшей кнопки/диалога съедает 120s вместо того, чтобы
        // упасть за 15s с понятной причиной "элемент не найден".
        actionTimeout: 15_000,
        // ИСПРАВЛЕНО: свой скачанный Playwright-Chromium ловит
        // net::ERR_SSL_PROTOCOL_ERROR через рабочий VPN/прокси, хотя
        // установленный в системе Chrome через тот же VPN сайт открывает
        // нормально — VPN-клиент, судя по всему, различает трафик по
        // конкретному exe. channel: "chrome" заставляет Playwright
        // запускать именно установленный Chrome, а не свой бинарник.
        // Если вместо Chrome проверялся Edge — замени на channel: "msedge".
        channel: "chrome",
        baseURL: process.env.POMIDORQA_BASE_URL ?? "https://aiqa.su",
        trace: "retain-on-failure",
        screenshot: "only-on-failure",
        video: "retain-on-failure",
      },
    },
  ],
});