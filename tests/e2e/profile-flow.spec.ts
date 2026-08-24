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
const locForProfileTelegram = (page: Page) => page.getByLabel('Telegram');
const locForChooseTimezone = (page: Page) => page.getByLabel('Часовой пояс');
const locForFillAboutYourself = (page: Page) => page.getByLabel('О себе');

const locForInputProfileSkill = (page: Page) => page.getByLabel('Навык');
const locForAddSkillTypeSelect = (page: Page) => page.locator('#pomidorqa-profile-skill-type');
const locForButtonSubmitAddSkill = (page: Page) => page.getByRole('button', { name: 'Добавить' });
const locForCanHelpSkills = (page: Page) => page.getByTestId('can-help-skills');



async function registerUser(page: Page, user: TestUser) {
  await page.goto("/pomidorqa/auth/register");
  await locForRegisterName(page).fill(user.name);
  await locForRegisterEmail(page).fill(user.email);
  await locForRegisterPassword(page).fill(user.password);
  await forButtonSubmitRegister(page).click();
  await expect(page).toHaveURL(/\/pomidorqa\/?$/);
}

test.describe("тесты на профиле для ДЗ 8", () => {
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
    await locForChangeProfileName(page).clear();
    await locForChangeProfileName(page).fill(user.name+'_changed');
    await locForSubmitProfileChange(page).click();
    await expect(locForChangeProfileName(page)).toHaveValue(user.name+'_changed');
  });

  test("заполнение ника в telegram", async ({ page }) => {
    const role = user.name.split(' ')[0];
    await locForProfileTelegram(page).fill('@'+role);
    await locForSubmitProfileChange(page).click();
    await expect(locForProfileTelegram(page)).toHaveValue('@'+role);
  });

  test("выбор часового пояса", async ({ page }) => {
    await locForChooseTimezone(page).selectOption({ label: 'Asia/Novosibirsk' });
    await locForSubmitProfileChange(page).click();
    await expect(locForChooseTimezone(page)).toContainText('Asia/Novosibirsk');
  });

  test("заполнение О себе", async ({ page }) => {
    await locForFillAboutYourself(page).fill('Изучаю автотесты на практике. Могу рассказать про '+skillTag);
    await locForSubmitProfileChange(page).click();
    await expect(locForFillAboutYourself(page)).toHaveValue('Изучаю автотесты на практике. Могу рассказать про '+skillTag);
  });

  test("добавление навыка", async ({ page }) => {
    await locForInputProfileSkill(page).fill(skillTag);
    await locForAddSkillTypeSelect(page).selectOption("can_help");
    await locForButtonSubmitAddSkill(page).click();
    await expect(locForCanHelpSkills(page)).toContainText(skillTag);
  });

});