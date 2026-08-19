import { test, expect, type Page } from "@playwright/test";

type TestUser = {
  name: string;
  email: string;
  password: string;
};

function makeUser(role: string, runId: number): TestUser {
   return {
    name: `${role}-${runId}`,
    email: `${role}-${runId}@example.com`,
    password: `pw-${runId}`,
  };
}

async function registerUser(page: Page, user: TestUser) {
    await page.goto("/pomidorqa/auth/register");
  await page.getByLabel("Имя").fill(user.name);
  await page.getByLabel("Email").fill(user.email);
  await page.getByLabel("Пароль").fill(user.password);
  await page.getByRole("button", { name: "Зарегистрироваться" }).click();
  await expect(page).toHaveURL(/\/pomidorqa\/?$/);
}

test.describe("Arrange Practice", () => {
  let user: TestUser;

  test.beforeEach(async ({ page }) => {
    const runId = Date.now();
    user = makeUser("arrange-practice", runId);
    await registerUser(page, user);
    await page.goto("/pomidorqa/profile/slots");
  });

  test("My slots", async ({ page }) => {
    await expect(page).toHaveURL(/\/pomidorqa\/profile\/slots\/?$/);
    await expect(page.getByRole("heading", { level: 1, name: "Мои слоты" })).toBeVisible();
  });

  test("Add slot", async ({ page }) => {
    const today = new Date().toISOString().slice(0, 10);
    await expect(page.locator("#pomidorqa-slots-date")).toHaveAttribute("min", today);
    await expect(page.locator("#pomidorqa-slots-time")).toBeVisible();
    await expect(page.getByRole("button", { name: "Добавить слот" })).toBeVisible();
  });
});