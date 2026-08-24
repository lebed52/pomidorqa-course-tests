import { test, expect, type Page } from "@playwright/test";

type TestUser = {
  name: string;
  email: string;
  password: string;
};

function makeUser(role: string, runId: number): TestUser {
  return {
    name: `${role} Автотест`,
    email: `${role}-${runId}@example.com`,
    password: "testpass123",
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

let user: TestUser;

test.beforeEach(async ({ page }) => {
  user = makeUser("user", Date.now());
  await registerUser(page, user);
  await page.goto("/pomidorqa/profile");
});

test("Пользователь может изменить имя в профиле", async ({ page }) => {
  const newName = `Новое имя ${Date.now()}`;

  await page.getByRole("textbox", { name: "Имя" }).fill(newName);
  await page.getByRole("button", { name: "Сохранить" }).click();

  await expect(
    page.getByRole("textbox", { name: "Имя" })
  ).toHaveValue(newName);
});

test("Пользователь может изменить часовой пояс", async ({ page }) => {
  await page
    .getByLabel("Часовой поясEurope/")
    .selectOption("Europe/Kaliningrad");

  await page.getByRole("button", { name: "Сохранить" }).click();

  await expect(
    page.getByLabel("Часовой поясEurope/")
  ).toHaveValue("Europe/Kaliningrad");
});

test("Пользователь может изменить Telegram", async ({ page }) => {
  const telegram = `user${Date.now()}`;

  await page.getByRole("textbox", { name: "Telegram" }).fill(telegram);
  await page.getByRole("button", { name: "Сохранить" }).click();

  await expect(
    page.getByRole("textbox", { name: "Telegram" })
  ).toHaveValue(telegram);
});

test("Пользователь может изменить информацию о себе", async ({ page }) => {
  const about = `Информация обо мне ${Date.now()}`;

  await page.getByRole("textbox", { name: "О себе" }).fill(about);
  await page.getByRole("button", { name: "Сохранить" }).click();

  await expect(
    page.getByRole("textbox", { name: "О себе" })
  ).toHaveValue(about);
});

test("Пользователь может добавить навык", async ({ page }) => {
  const skill = `Навык ${Date.now()}`;

  await page.getByRole("textbox", { name: "Навык" }).fill(skill);

  await page
    .getByLabel("ТипМогу помочьХочу разобрать")
    .selectOption("can_help");

  await page.getByRole("button", { name: "Добавить" }).click();

  await expect(
    page.getByTestId("can-help-skills")
  ).toContainText(skill);
});