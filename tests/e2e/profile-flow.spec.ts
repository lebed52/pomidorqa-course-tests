import { test, expect, type Page } from '@playwright/test';

type TestUser = {
  name: string;
  email: string;
  password: string;
};

//Локаторы
const locators = {
  register: {
    name: (page: Page) => page.locator('#pomidorqa-register-name'),
    email: (page: Page) => page.locator('#pomidorqa-register-email'),
    password: (page: Page) => page.locator('#pomidorqa-register-password'),
    submit: (page: Page) => page.getByRole('button', { name: 'Зарегистрироваться' }),
  },
  profile: {
    name: (page: Page) => page.locator('[name="name"]'),
    telegram: (page: Page) => page.locator('[name="telegram"]'),
    timezone: (page: Page) => page.locator('[name="timezone"]'),
    bio: (page: Page) => page.locator('[name="bio"]'),
    saveButton: (page: Page) => page.getByRole('button', { name: 'Сохранить' }),
    skillInput: (page: Page) => page.locator('#pomidorqa-profile-skill-input'),
    skillType: (page: Page) => page.locator('#pomidorqa-profile-skill-type'),
    addSkillButton: (page: Page) => page.getByRole('button', { name: 'Добавить' }),
    canHelpSkills: (page: Page) => page.locator('[data-testid="can-help-skills"]'),
  },
};

//Хелперы
function makeUser(role: string, runId: number): TestUser {
  return {
    name: `${role} Автотест`,
    email: `${role}-${runId}@example.com`,
    password: 'testpass123',
  };
}

async function registerUser(page: Page, user: TestUser) {
  await page.goto('/pomidorqa/auth/register');
  await locators.register.name(page).fill(user.name);
  await locators.register.email(page).fill(user.email);
  await locators.register.password(page).fill(user.password);
  await locators.register.submit(page).click();
  await expect(page).toHaveURL(/\/pomidorqa\/?$/);
}

test.describe('Тесты для профиля', () => {
  let user: TestUser;
  let skillTag: string;

  test.beforeEach(async ({ page }) => {
    const runId = Date.now();
    user = makeUser('test', runId);
    skillTag = `Skill-${runId}`;

    await registerUser(page, user);
    await page.goto('/pomidorqa/profile');
  });

  test('Изменение имени в профиле', async ({ page }) => {
    const newName = `Новое имя ${Date.now()}`;
    await locators.profile.name(page).fill(newName);
    await locators.profile.saveButton(page).click();
    await expect(locators.profile.name(page)).toHaveValue(newName);
  });

  test('Изменение Telegram', async ({ page }) => {
    const telegram = `@user_${Date.now()}`;
    await locators.profile.telegram(page).fill(telegram);
    await locators.profile.saveButton(page).click();
    await expect(locators.profile.telegram(page)).toHaveValue(telegram);
  });

  test('Изменение часового пояса', async ({ page }) => {
    await locators.profile.timezone(page).selectOption('Asia/Novosibirsk');
    await locators.profile.saveButton(page).click();
    await expect(locators.profile.timezone(page)).toHaveValue('Asia/Novosibirsk');
  });

  test('Изменение "О себе"', async ({ page }) => {
    const bio = `Host autotest ${Date.now()}`;
    await locators.profile.bio(page).fill(bio);
    await locators.profile.saveButton(page).click();
    await expect(locators.profile.bio(page)).toHaveValue(bio);
  });

  test('Добавления навыка', async ({ page }) => {
    await locators.profile.skillInput(page).fill(skillTag);
    await locators.profile.skillType(page).selectOption('can_help');
    await locators.profile.addSkillButton(page).click();
    await expect(locators.profile.canHelpSkills(page)).toContainText(skillTag);
  });
});
