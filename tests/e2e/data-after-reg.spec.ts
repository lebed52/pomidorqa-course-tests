import { test, expect, type Page } from '@playwright/test';

type TestUser = {
  name: string;
  email: string;
  password: string;
};

const registerNameInput = (page: Page) => page.getByLabel('Имя');
const registerEmailInput = (page: Page) => page.getByLabel('Email');
const registerPasswordInput = (page: Page) => page.getByLabel('Пароль');
const registerSubmitButton = (page: Page) =>
  page.getByRole('button', { name: 'Зарегистрироваться' });

const profileSkillInput = (page: Page) => page.locator('#pomidorqa-profile-skill-input');
const profileSkillTypeSelect = (page: Page) => page.locator('#pomidorqa-profile-skill-type');
const profileSkillSubmit = (page: Page) => page.getByRole('button', { name: 'Добавить' });
const profileCanHelpSkills = (page: Page) => page.getByTestId('can-help-skills');

const profileNameInput = (page: Page) => page.getByLabel('Имя');
const profileSaveButton = (page: Page) => page.getByRole('button', { name: 'Сохранить' });

const slotsDateInput = (page: Page) => page.locator('#pomidorqa-slots-date');
const slotsTimeInput = (page: Page) => page.locator('#pomidorqa-slots-time');
const slotsAddSubmit = (page: Page) => page.getByRole('button', { name: 'Добавить слот' });
const slotsCard = (page: Page) => page.locator('[data-slot-id]');

function makeUser(role: string, runId: number): TestUser {
  return {
    name: `${role} Автотест`,
    email: `${role}-${runId}@example.com`,
    password: 'testpass123',
  };
}

async function registerUser(page: Page, user: TestUser) {
  await page.goto('/pomidorqa/auth/register');
  await registerNameInput(page).fill(user.name);
  await registerEmailInput(page).fill(user.email);
  await registerPasswordInput(page).fill(user.password);
  await registerSubmitButton(page).click();
  await expect(page).toHaveURL(/\/pomidorqa\/?$/);
}

test.describe('Действия в профиле пользователя после регистрации', () => {
  test.beforeEach(async ({ page }) => {
    const runId = Date.now();
    const user = makeUser('user', runId);

    await registerUser(page, user);
    await page.goto('/pomidorqa/profile');
  });

  test('Смена имени в профиле', async ({ page }) => {
    const newName = `new user ${Date.now()}`;
    await profileNameInput(page).fill(newName);
    await profileSaveButton(page).click();
    await expect(profileNameInput(page)).toHaveValue(newName);
  });

  test('Добавление навыка', async ({ page }) => {
    const skillTag = `Skill-${Date.now()}`;
    await profileSkillInput(page).fill(skillTag);
    await profileSkillTypeSelect(page).selectOption('can_help');
    await profileSkillSubmit(page).click();
    await expect(profileCanHelpSkills(page)).toContainText(skillTag);
  });

  test('Добавление слота', async ({ page }) => {
    await page.goto('/pomidorqa/profile/slots');
    const tomorrow = new Date(Date.now() + 24 * 60 * 60 * 1000);
    const date = tomorrow.toISOString().slice(0, 10);

    await slotsDateInput(page).fill(date);
    await slotsTimeInput(page).fill('12:00');
    await slotsAddSubmit(page).click();
    await expect(slotsCard(page).first()).toBeVisible();
  });
});
