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

test.describe("Act Practice", () => {
  let user: TestUser;

  test.beforeEach(async ({ page }) => {
    const runId = Date.now();
    user = makeUser("act-practice", runId);
    await registerUser(page, user);
    await page.goto("/pomidorqa/profile");
  });

  test("Имя: изменить и сохранить", async ({ page }) => {
    const newName = `${user.name}-upd`;
    await page.getByLabel("Имя").fill(newName);
    await page.getByRole("button", { name: "Сохранить" }).click();
    await expect(page.getByLabel("Имя")).toHaveValue(newName);
  });

  test("Часовой пояс: выбрать и сохранить", async ({ page }) => {
    const timezone = "Asia/Yekaterinburg";
    await page.getByLabel("Часовой пояс").selectOption(timezone);
    await page.getByRole("button", { name: "Сохранить" }).click();
    await expect(page.getByLabel("Часовой пояс")).toHaveValue(timezone);
  });

  test("Telegram: заполнить и сохранить", async ({ page }) => {
    const telegram = `@act${Date.now()}`;
    await page.getByLabel("Telegram").fill(telegram);
    await page.getByRole("button", { name: "Сохранить" }).click();
    await expect(page.getByLabel("Telegram")).toHaveValue(telegram);
  });

  test("О себе: заполнить и сохранить", async ({ page }) => {
    const bio = `Bio for ${user.name}`;
    await page.getByLabel("О себе").fill(bio);
    await page.getByRole("button", { name: "Сохранить" }).click();
    await expect(page.getByLabel("О себе")).toHaveValue(bio);
  });

  test("Навык: добавить «могу помочь»", async ({ page }) => {
    const skillTag = `skill-${Date.now()}`;
    await page.locator("#pomidorqa-profile-skill-input").fill(skillTag);
    await page.locator("#pomidorqa-profile-skill-type").selectOption("can_help");
    await page.getByRole("button", { name: "Добавить" }).click();
    await expect(page.getByTestId("can-help-skills")).toContainText(skillTag);
  });
});
