import { test, expect, type Page } from "@playwright/test";

const registerNameInput = (page: Page) =>
  page.getByRole("textbox", { name: "Имя" });

const registerEmailInput = (page: Page) =>
  page.getByRole("textbox", { name: "Email" });

const registerPasswordInput = (page: Page) =>
  page.getByLabel('Пароль');

const registerSubmitButton = (page: Page) =>
  page.getByRole("button", { name: "Зарегистрироваться" });

const profileNameInput = (page: Page) => page.getByLabel('Имя');

const profileSkillInput = (page: Page) => page.getByLabel("Навык");

const slotsEmptyMessage = (page: Page) =>
  page.getByText('Пока нет запланированных слотов');

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
  await registerNameInput(page).fill(user.name);
  await registerEmailInput(page).fill(user.email);
  await registerPasswordInput(page).fill(user.password);
  await registerSubmitButton(page).click();
  await expect(page).toHaveURL(/\/pomidorqa\/?$/);
}

test.describe("Arrange practice", () => {
  let user: TestUser;
  
  test.beforeEach(async ({ page }) => {
    const runId = Date.now();
    user = makeUser("testuser", runId);
    await registerUser(page, user);
    await page.goto("/pomidorqa/profile");
  });

  test("Проверяем, что имя пользователя из фабрики отображаетс", async ({ page }) => {
    await expect(profileNameInput(page)).toHaveValue(user.name);
    
  });
  test("Проверяем, что у пользователя нет навыков", async ({ page }) => {
    await expect(profileSkillInput(page)).toBeEmpty();
  });

  test("Проверяем, что нет забронированных слотов", async ({ page }) => {
    await page.goto("/pomidorqa/profile/slots");
    await expect(slotsEmptyMessage(page)).toBeVisible();
  });
});