import { test, expect } from "@playwright/test";

test.describe("Поиск на главной PomidorQA", () => {
  test("форма поиска доступна пользователю", async ({ page }) => {
    await test.step("Открываем главную страницу", async () => {
      await page.goto("/pomidorqa");
    });

    await test.step("Видим поле и кнопку поиска", async () => {
      await expect(page.getByLabel("Навык")).toBeVisible();
      await expect(page.getByRole("button", { name: "Найти" })).toBeVisible();
    });
  });

  test("тест 1", async ({ page }) => {
    await page.goto("/pomidorqa");
    await expect(page.locator("#pomidorqa-catalog-skill-filter")).toBeVisible();
  });
});
