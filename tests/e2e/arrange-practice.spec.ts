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
    await page.goto("/pomidorqa/profile");
  });

  test("мир 1: в профиле имя из фабрики", async ({ page }) => {
    await expect(page.getByLabel("Имя")).toHaveValue(user.name);
  });

  test("мир 2: у нового пользователя нет навыков", async ({ page }) => {
    await expect(page.getByTestId("can-help-skills")).toHaveCount(0);
  });

  test("мир 3: новый пользователь может добавить слот", async ({ page }) => {
    await page.goto("/pomidorqa/profile/slots");

    const tomorrow = new Date(Date.now() + 24 * 60 * 60 * 1000);
    const date = tomorrow.toISOString().slice(0, 10);

    await page.locator("#pomidorqa-slots-date").fill(date);
    await page.locator("#pomidorqa-slots-time").fill("12:00");
    await page.getByRole("button", { name: "Добавить слот" }).click();

    await expect(page.locator("[data-slot-id]").first()).toBeVisible();
  });
});