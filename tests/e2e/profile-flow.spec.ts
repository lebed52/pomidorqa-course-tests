import { test, expect, type Page } from "@playwright/test";

// ЛОКАТОРЫ

//Регистрация юзера 
const registerNameInput = (page: Page) => page.locator('#pomidorqa-register-name');
const registerEmailInput = (page: Page) => page.locator('#pomidorqa-register-email');
const registerPasswordInput = (page: Page) => page.locator('#pomidorqa-register-password');
const registerSubmitButton = (page: Page) => page.getByRole('button', { name: 'Зарегистрироваться' });

//Смена имени
const profileNameInput = (page: Page) => page.getByLabel('Имя');
const profileSaveButton = (page: Page) => page.getByRole('button', { name: 'Сохранить' });

//Добавление Telegram
const profileTelegramInput = (page: Page) => page.getByLabel('Telegram');

//Добавление часового пояса
const profileTimeZoneSelect = (page: Page) => page.getByLabel('Часовой пояс');

//Добавление навыка
const profileSkillInput = (page: Page) => page.getByLabel('Навык');
const profileSkillTypeSelect = (page: Page) => page.getByRole('combobox', { name: 'Тип' });
const profileSkillSubmit = (page: Page) => page.getByRole('button', { name: 'Добавить' });
const profileSkillList = (page: Page) => page.locator('[data-testid="can-help-skills"]');

//Добавление "О себе"
const profileAboutMeInput = (page: Page) => page.getByLabel('О себе');

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

test.describe("Данные после регистрации", () => {
  let user: TestUser;

  test.beforeEach(async ({ page }) => {
    const runId = Date.now();
    user = makeUser("testuser", runId);
    await registerUser(page, user);
    await page.goto("/pomidorqa/profile");
  });

  test("Смена имени в профиле", async ({ page }) => {
    const newName = `Новое имя ${Date.now()}`;
    await profileNameInput(page).fill(newName);
    await profileSaveButton(page).click();
    await expect(profileNameInput(page)).toHaveValue(newName);
  });

  test("Добавление Telegram", async ({ page }) => {
   const telegram = `Телеграмм-${Date.now()}`;
   await profileTelegramInput(page).fill(telegram);
   await profileSaveButton(page).click();
   await expect(profileTelegramInput(page)).toHaveValue(telegram);
  });

  test("Добавление часового пояса", async ({ page }) => {
    await profileTimeZoneSelect(page).selectOption('Europe/Kaliningrad');
    await profileSaveButton(page).click();
    await expect(profileTimeZoneSelect(page)).toHaveValue('Europe/Kaliningrad');
   });

  test("Добавление навыка", async ({ page }) => {
    const skill = `Навык-${Date.now()}`;
    await profileSkillInput(page).fill(skill);
    await profileSkillTypeSelect(page).selectOption("can_help");
    await profileSkillSubmit(page).click();
    await expect(profileSkillList(page)).toContainText(skill);
  });

  test("Добавление О себе", async ({ page }) => {
    const about = `Моя заметка-${Date.now()}`;
    await profileAboutMeInput(page).fill(about);
    await profileSaveButton(page).click();
    await expect(profileAboutMeInput(page)).toHaveValue(about);
});
});
