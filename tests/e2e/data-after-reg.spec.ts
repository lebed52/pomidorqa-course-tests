import { test, expect, type Page } from '@playwright/test';

type TestUser = {
  name: string;
  email: string;
  password: string;
};

//Локаторы
const locators = {
  // Регистрация
  register: {
    name: '#pomidorqa-register-name',
    email: '#pomidorqa-register-email',
    password: '#pomidorqa-register-password',
    submit: 'Зарегистрироваться',
  },
  // Профиль
  profile: {
    name: '[name="name"]',
    saveButton: 'Сохранить',
    skillInput: '#pomidorqa-profile-skill-input',
    skillType: '#pomidorqa-profile-skill-type',
    addSkillButton: 'Добавить',
    canHelpSkills: '[data-testid="can-help-skills"]',
  },
  // Слоты
  slots: {
    date: '#pomidorqa-slots-date',
    time: '#pomidorqa-slots-time',
    addSlotButton: 'Добавить слот',
    card: '[data-slot-id]',
  },
};

//Функции
function makeUser(role: string, runId: number): TestUser {
  return {
    name: `${role} Автотест`,
    email: `${role}-${runId}@example.com`,
    password: 'testpass123',
  };
}

async function registerUser(page: Page, user: TestUser) {
  await page.goto('/pomidorqa/auth/register');
  await page.locator(locators.register.name).fill(user.name);
  await page.locator(locators.register.email).fill(user.email);
  await page.locator(locators.register.password).fill(user.password);
  await page.getByRole('button', { name: locators.register.submit }).click();
  await expect(page).toHaveURL(/\/pomidorqa\/?$/);
}

test.describe('Тесты после регистрации', () => {
  let user: TestUser;
  let skillTag: string;

  test.beforeEach(async ({ page }) => {
    const runId = Date.now();
    user = makeUser('test', runId);
    skillTag = `Skill-${runId}`;

    await registerUser(page, user);
    await page.goto('/pomidorqa/profile');
  });

  test('Смена имени в профиле', async ({ page }) => {
    // Act
    const newName = `Новое имя ${Date.now()}`;
    await page.locator(locators.profile.name).fill(newName);
    await page.getByRole('button', { name: locators.profile.saveButton }).click();

    // Assert
    await expect(page.locator(locators.profile.name)).toHaveValue(newName);
  });

  test('Добавления навыка', async ({ page }) => {
    // Act
    await page.locator(locators.profile.skillInput).fill(skillTag);
    await page.locator(locators.profile.skillType).selectOption('can_help');
    await page.getByRole('button', { name: locators.profile.addSkillButton }).click();

    // Assert
    await expect(page.locator('[data-testid="can-help-skills"]')).toContainText(skillTag);
  });

  test('Добавления слота', async ({ page }) => {
    await page.goto('/pomidorqa/profile/slots');

    const tomorrow = new Date(Date.now() + 24 * 60 * 60 * 1000);
    const date = tomorrow.toISOString().slice(0, 10);

    await page.locator(locators.slots.date).fill(date);
    await page.locator(locators.slots.time).fill('12:00');
    await page.getByRole('button', { name: locators.slots.addSlotButton }).click();

    await expect(page.locator(locators.slots.card).first()).toBeVisible();
  });
});
