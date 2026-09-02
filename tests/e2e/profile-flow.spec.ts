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
const profileSkillTagByName = (page: Page, name: string) =>
  page.locator(`[data-skill-tag="${name}"]`); // для конкретного тега навыка

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
    await test.step('Подготовка: Регистрация и переход в профиль', async () => {
      const runId = Date.now();
      user = makeUser('user', runId);
      skillTag = `Skill-${runId}`;

      await registerUser(page, user);
      await page.goto('/pomidorqa/profile');
    });
  });

  // Тест №1
  test('Тест №1: Изменение имени в профиле', async ({ page }) => {
    const username = `имя ${Date.now()}`;

    await test.step('Заполнить и сохранить новое имя', async () => {
      await profileNameInput(page).fill(username);
      await profileSaveButton(page).click();
    });

    await test.step('Проверить, что новое имя сохранилось', async () => {
      await expect(profileNameInput(page)).toHaveValue(username);
    });
  });

  // Тест №2
  test('Тест №2: Изменение профиля Telegram в профиле', async ({ page }) => {
    const telegramName = `@TG-${Date.now()}`;

    await test.step('Заполнить и сохранить Telegram', async () => {
      await profileTelegramInput(page).fill(telegramName);
      await profileSaveButton(page).click();
    });

    await test.step('Проверить отображение Telegram', async () => {
      await expect(profileTelegramInput(page)).toHaveValue(telegramName);
    });
  });

  // Тест №3
  test('Тест №3: Изменение часового пояса в профиле', async ({ page }) => {
    const timezoneIrkutsk = 'Asia/Irkutsk';

    await test.step('Выбрать и сохранить часовой пояс', async () => {
      await profileTimezoneSelect(page).selectOption(timezoneIrkutsk);
      await profileSaveButton(page).click();
    });
    await test.step('Проверить выбранный часовой пояс', async () => {
      await expect(profileTimezoneSelect(page)).toHaveValue(timezoneIrkutsk);
    });
  });

  // Тест №4
  test('Тест №4: Изменение описания о себе в профиле', async ({ page }) => {
    const aboutText = `About me ${Date.now()}`;

    await test.step('Заполнить поле "О себе" и сохранить', async () => {
      await profileAboutInput(page).fill(aboutText);
      await profileSaveButton(page).click();
    });

    await test.step('Проверить текст в поле "О себе"', async () => {
      await expect(profileAboutInput(page)).toHaveValue(aboutText);
    });
  });

  // Тест №5
  test('Тест №5: Добавление навыка в профиле', async ({ page }) => {
    await test.step('Заполнить форму и добавить навык', async () => {
      await profileSkillInput(page).fill(skillTag);
      await profileSkillTypeSelect(page).selectOption({ label: 'Хочу разобрать' });
      await profileSkillSubmit(page).click();
    });

    await test.step('Проверить появление тега навыка', async () => {
      await expect(profileSkillTagByName(page, skillTag)).toBeVisible();
    });
  });
});
