import { test, expect, type Page } from "@playwright/test";

const registerNameInput = (page: Page) => page.locator('#pomidorqa-register-name');
const registerEmailInput = (page: Page) => page.locator('#pomidorqa-register-email');
const registerPasswordInput = (page: Page) => page.locator('#pomidorqa-register-password');
const registerSubmitButton = (page: Page) => page.getByRole('button', { name: 'Зарегистрироваться' });

const profileNameInput = (page: Page) => page.getByLabel('Имя');
const profileSaveButton = (page: Page) => page.getByRole('button', { name: 'Сохранить' });
const profileHeading = (page: Page) => page.getByRole('heading', { level: 1 });

const profileSkillInput = (page: Page) => page.getByLabel('Навык');
const profileSkillTypeSelect = (page: Page) => page.getByRole('combobox', { name: 'Тип' });
const profileSkillSubmit = (page: Page) => page.getByRole('button', { name: 'Добавить' });
const profileSkillList = (page: Page) => page.locator('[data-testid="can-help-skills"]');

const slotDateInput = (page: Page) => page.locator('input[type="date"]');
const slotTimeInput = (page: Page) => page.locator('input[type="time"]');
const slotAddSubmit = (page: Page) => page.getByRole('button', { name: 'Добавить слот' });
const slotCard = (page: Page) => page.locator('[data-slot-status="free"]').first();

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

  test("смена имени в профиле", async ({ page }) => {
    const newName = `Новое имя ${Date.now()}`;
    await profileNameInput(page).fill(newName);
    await profileSaveButton(page).click();
    await expect(profileNameInput(page)).toHaveValue(newName);
  });

  test("добавление навыка", async ({ page }) => {
    const skill = `Навык-${Date.now()}`;
    await profileSkillInput(page).fill(skill);
    await profileSkillTypeSelect(page).selectOption("can_help");
    await profileSkillSubmit(page).click();
    await expect(profileSkillList(page)).toContainText(skill);
  });

  test("добавление слота", async ({ page }) => {
    await page.goto("/pomidorqa/profile/slots");
    const tomorrow = new Date(Date.now() + 24 * 60 * 60 * 1000);
    const date = tomorrow.toISOString().slice(0, 10);
    await slotDateInput(page).fill(date);
    await slotTimeInput(page).fill("12:00");
    await slotAddSubmit(page).click();
    await expect(slotCard(page)).toBeVisible({ timeout: 15000 });
  });
});
