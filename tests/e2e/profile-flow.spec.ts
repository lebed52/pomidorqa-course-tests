import { test, expect, type Page } from '@playwright/test';

type TestUser = {
  name: string;
  email: string;
  password: string;
};

// Локаторы
// Регистрация
const registerNameInput = (page: Page) => page.getByLabel('Имя');
const registerEmailInput = (page: Page) => page.getByLabel('Email');
const registerPasswordInput = (page: Page) => page.getByLabel('Пароль');
const registerSubmitButton = (page: Page) =>
  page.getByRole('button', { name: 'Зарегистрироваться' });

// Профиль - данные
const profileNameInput = (page: Page) => page.getByLabel('Имя');
const profileTelegramInput = (page: Page) => page.getByLabel('Telegram');
const profileTimezoneSelect = (page: Page) => page.getByLabel('Часовой пояс');
const profileAboutInput = (page: Page) => page.getByLabel('О себе');
const profileSaveButton = (page: Page) => page.getByRole('button', { name: 'Сохранить' });

// Профиль - навыки
const profileSkillInput = (page: Page) => page.getByLabel('Навык');
const profileSkillTypeSelect = (page: Page) => page.getByLabel('Тип');
const profileSkillSubmit = (page: Page) => page.getByRole('button', { name: 'Добавить' });

// Фабрика
function makeUser(role: string, runId: number): TestUser {
  return {
    name: `${role} Автотест`,
    email: `${role}-${runId}@example.com`,
    password: 'testpass123',
  };
}

// Хелпер
async function registerUser(page: Page, user: TestUser) {
  await page.goto('/pomidorqa/auth/register');
  await registerNameInput(page).fill(user.name);
  await registerEmailInput(page).fill(user.email);
  await registerPasswordInput(page).fill(user.password);
  await registerSubmitButton(page).click();
  await expect(page).toHaveURL(/\/pomidorqa\/?$/);
}

test.describe('Внесение данных в профиле', () => {
  let user: TestUser;
  let skillTag: string;

  test.beforeEach(async ({ page }) => {
    const runId = Date.now();
    user = makeUser('user', runId);
    skillTag = 'Skill-${runId}';

    await registerUser(page, user);
    await page.goto('/pomidorqa/profile');
  });

  test('Изменение имени в профиле', async ({ page }) => {
    const username = 'имя ${Date.now()}';
    await profileNameInput(page).fill(username);
    await profileSaveButton(page).click();
    await expect(profileNameInput(page)).toHaveValue(username);
  });

  test('Изменение профиля Telegram в профиле', async ({ page }) => {
    const telegramName = '@TG-${Date.now()}';
    await profileTelegramInput(page).fill(telegramName);
    await profileSaveButton(page).click();
    await expect(profileTelegramInput(page)).toHaveValue(telegramName);
  });

  test('Изменение часового пояса в профиле', async ({ page }) => {
    const timezoneIrkutsk = 'Asia/Irkutsk';
    await profileTimezoneSelect(page).selectOption(timezoneIrkutsk);
    await profileSaveButton(page).click();
    await expect(profileTimezoneSelect(page)).toHaveValue(timezoneIrkutsk);
  });

  test('Изменение описания о себе в профиле', async ({ page }) => {
    const aboutText = 'About me ${Date.now()}';
    await profileAboutInput(page).fill(aboutText);
    await profileSaveButton(page).click();
    await expect(profileAboutInput(page)).toHaveValue(aboutText);
  });

  test('Добавление навыка в профиле', async ({ page }) => {
    await profileSkillInput(page).fill(skillTag);
    await profileSkillTypeSelect(page).selectOption('Хочу разобрать');
    await profileSaveButton(page).click();
    await expect(profileSkillInput(page)).toHaveValue(skillTag);
  });
});
