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
  await page.getByRole("textbox", { name: "Имя" }).fill(user.name);
  await page.getByRole("textbox", { name: "Email" }).fill(user.email);
  await page.getByRole("textbox", { name: "Пароль" }).fill(user.password);
  await page.getByRole("button", { name: "Зарегистрироваться" }).click();
  await expect(page).toHaveURL(/\/pomidorqa\/?$/);
}

let runId: number;
let host: TestUser;

test.beforeEach(async ({ page }) => {
  runId = Date.now();
  host = makeUser("host", runId);

  await registerUser(page, host);
});

test("хост после регистрации видит главную страницу", async ({ page }) => {
  await expect(page).toHaveURL(/\/pomidorqa\/?$/);
});

test("профиль хоста открывается после регистрации", async ({ page }) => {
  await page.goto("/pomidorqa/profile");
  await expect(page).toHaveURL(/\/pomidorqa\/profile$/);
});