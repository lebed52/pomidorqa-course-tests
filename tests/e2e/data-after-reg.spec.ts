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

const locForRegisterName = (page: Page) => page.locator('#pomidorqa-register-name');
const locForRegisterEmail = (page: Page) => page.locator('#pomidorqa-register-email');
const locForRegisterPassword = (page: Page) => page.locator('#pomidorqa-register-password');
const forButtonSubmitRegister = (page: Page) => page.getByRole('button', { name: 'Зарегистрироваться' });

const locForChangeProfileName = (page: Page) => page.getByLabel('Имя');
const locForSubmitProfileChange = (page: Page) => page.getByRole('button', { name: 'Сохранить' });

const locForInputProfileSkill = (page: Page) => page.getByLabel('Навык');
const locForAddSkillTypeSelect = (page: Page) => page.locator('#pomidorqa-profile-skill-type');
const locForButtonSubmitAddSkill = (page: Page) => page.getByRole('button', { name: 'Добавить' });
const locForCanHelpSkills = (page: Page) => page.getByTestId('can-help-skills');

const locForInputSlotsDate = (page: Page) => page.getByLabel('Дата');
const locForInputSlotsTime = (page: Page) => page.locator('[type="time"]');
const locForSubmitSlotsAdd = (page: Page) => page.getByRole('button', { name: /Добавить/i });
const locForCheckDataSlotStatus = (page: Page) => page.locator('[data-slot-status="free"]').first();

async function registerUser(page: Page, user: TestUser) {
  await page.goto("/pomidorqa/auth/register");
  await locForRegisterName(page).fill(user.name);
  await locForRegisterEmail(page).fill(user.email);
  await locForRegisterPassword(page).fill(user.password);
  await forButtonSubmitRegister(page).click();
  await expect(page).toHaveURL(/\/pomidorqa\/?$/);
}

test.describe("тесты на профиле для ДЗ 7", () => {
  let user: TestUser;
  let skillTag: string;

  test.beforeEach(async ({ page }) => {
    // Arrange:
    const runId = Date.now();
    skillTag = `Playwright-demo-${runId}`;
    user = makeUser('test1', runId); // 1) новый пользователь из фабрики
    await registerUser(page, user); // 2) регистрация через хелпер
    await page.goto("/pomidorqa/profile"); // 3) переход на страницу, где будет проверка
  });

  test("смена имени в профиле", async ({ page }) => {
    await locForChangeProfileName(page).fill('changed_name');
    await locForSubmitProfileChange(page).click();
    await expect(locForChangeProfileName(page)).toHaveValue('changed_name');
  });

  test("добавление навыка", async ({ page }) => {
    await locForInputProfileSkill(page).fill(skillTag);
    await locForAddSkillTypeSelect(page).selectOption("can_help");
    await locForButtonSubmitAddSkill(page).click();
    await expect(locForCanHelpSkills(page)).toContainText(skillTag);
  });

  test("добавление слота", async ({ page }) => {
    await page.goto("/pomidorqa/profile/slots");
    const tomorrow = new Date(Date.now() + 24 * 60 * 60 * 1000);
    const date = tomorrow.toISOString().slice(0, 10);
    await locForInputSlotsDate(page).fill(date);
    await locForInputSlotsTime(page).fill("12:00");
    await locForSubmitSlotsAdd(page).click();
    await expect(locForCheckDataSlotStatus(page)).toBeVisible({ timeout: 5000 });
  });
});