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
  await expect(page.getByRole("textbox", { name: "Имя" })).toHaveValue(newName);
});

test("Пользователь может добавить навык", async ({ page }) => {
  const skillTag = `Playwright-${Date.now()}`;

  await page.getByRole("textbox", { name: "Навык" }).fill(skillTag);
  await page.getByLabel("ТипМогу помочьХочу разобрать").selectOption("can_help");
  await page.getByRole("button", { name: "Добавить" }).click();

  await expect(
  page.getByRole("button", { name: `${skillTag} ×` })
  ).toBeVisible();
});

test("Пользователь может добавить слот", async ({ page }) => {
  await page.goto("/pomidorqa/profile/slots");
  const tomorrow = new Date(Date.now() + 24 * 60 * 60 * 1000);
  const date = tomorrow.toISOString().slice(0, 10);

  await page.getByRole("textbox", { name: "Дата" }).fill(date);
  await page.getByRole("textbox", { name: "Время начала" }).fill("12:00");
  await page.getByRole("button", { name: "Добавить слот" }).click();

  await expect(
  page.getByText("свободен", { exact: true })
  ).toBeVisible();
});
