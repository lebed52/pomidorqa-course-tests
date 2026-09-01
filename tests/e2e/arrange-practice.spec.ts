import { test, expect, type Page } from "@playwright/test";

type TestUser = {
  name: string;
  email: string;
  password: string;
};

function makeUser(role: string, runId: string): TestUser {
  // фабрика: вернуть уникальные данные, без хардкода email
  return {
    name: `${role} Автотест`,
    email: `${role}-${runId}@example.com`,
    password: "testpass123",
  };
}

//Locators для регистрации пользователя
const registerNameInput = (page: Page) => page.getByLabel("Имя");
const registerEmailInput = (page: Page) => page.getByLabel("Email");
const registerPasswordInput = (page: Page) => page.getByLabel("Пароль");
const registerSubmitButton = (page: Page) => page.getByRole("button", { name: "Зарегистрироваться" });

async function registerUser(page: Page, user: TestUser) {
  await page.goto("/pomidorqa/auth/register");
  await registerNameInput(page).fill(user.name);
  await registerEmailInput(page).fill(user.email);
  await registerPasswordInput(page).fill(user.password);
  await registerSubmitButton(page).click();
  await expect(page).toHaveURL(/\/pomidorqa\/?$/);
}

test.describe("свой мир на каждый тест", () => {
  let user: TestUser;

  test.beforeEach(async ({ page }) => {
    const runId = Date.now();
    user = makeUser("user", runId);
    await registerUser(page, user);
    await page.goto("/pomidorqa/profile");
  });


  test("мир 1: смена имени в профиле", async ({ page }) => {
    const newName = `Updated ${Date.now()}`;
    await registerNameInput(page).fill(newName);
    await page.getByRole("button", { name: "Сохранить" }).click();
    await expect(registerNameInput(page)).toHaveValue(newName);
  });

  test("мир 2: добавление навыка", async ({ page }) => {
    const skillTag = `Playwright-demo-${Date.now()}`;
    await page.getByLabel("Навык").fill(skillTag);
    await page.getByLabel("Тип").selectOption("can_help");
    await page.getByRole("button", { name: "Добавить" }).click();
    await expect(page.getByTestId("can-help-skills")).toBeVisible();
  });

  test("мир 3: добавление слота", async ({ page }) => {
    await page.goto("/pomidorqa/profile/slots");
    const tomorrow = new Date(Date.now() + 24 * 60 * 60 * 1000);
    const date = tomorrow.toISOString().slice(0, 10);
    await page.getByLabel("Дата").fill(date);
    await page.getByLabel("Время начала").fill("12:00");
    await page.getByRole("button", { name: "Добавить слот" }).click();
    const freeSlot = page.locator('[data-slot-status="free"]').first();
    await expect(freeSlot).toBeVisible();
  });

});