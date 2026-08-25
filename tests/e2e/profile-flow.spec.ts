import { test, expect, type Page } from "@playwright/test";

//Локаторы

//register
const registerNameInput = (page: Page) => page.getByLabel("Имя");
const registerEmailInput = (page: Page) => page.getByLabel("Email");
const registerPasswordInput = (page: Page) => page.getByLabel("Пароль");
const registerSubmitButton = (page: Page) => page.getByRole("button", { name: "Зарегистрироваться" });

//profile
const profileNameInput = (page: Page) => page.getByLabel("Имя");
const profileTelegramInput = (page: Page) => page.getByLabel("Telegram");
const profileTimeZoneSelect = (page: Page) => page.getByLabel("Часовой пояс");
const profileBioInput = (page: Page) => page.getByLabel("О себе");
const profileSaveButton = (page: Page) => page.getByRole("button", { name: "Сохранить" });

const profileSkillInput = (page: Page) => page.locator("#pomidorqa-profile-skill-input");
const profileSkillTypeSelect = (page: Page) => page.locator("#pomidorqa-profile-skill-type");
const profileSkillSubmit = (page: Page) => page.getByRole("button", { name: "Добавить" });
const profileCanHelpSkills = (page: Page) => page.getByTestId("can-help-skills");



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

test.describe("Профиль: редактирование полей", () => {
  let user: TestUser;
  
  test.beforeEach(async ({ page }) => {
    const runId = Date.now();
    user = makeUser("testuser", runId);
    await registerUser(page, user);
    await page.goto("/pomidorqa/profile");
  });
  test("Изменение имени пользователя в профиле", async ({ page }) => {
      const newName = `Новое имя ${Date.now()}`;
      await profileNameInput(page).fill(newName);
      await profileSaveButton(page).click();
      await page.reload();
      await expect(profileNameInput(page)).toHaveValue(newName);
    });

  test("Telegram: заполняем поле в профиле", async ({ page }) => {
      const telegram = `@telegram${Date.now()}`;
      await profileTelegramInput(page).fill(telegram);
      await profileSaveButton(page).click();
      await page.reload();
      await expect(profileTelegramInput(page)).toHaveValue(telegram);
    });

  test("Смена часового пояса", async ({ page }) => {
      const timezone = "Asia/Irkutsk";
      await profileTimeZoneSelect(page).selectOption({ label: timezone });
      await profileSaveButton(page).click();
      await page.reload();
      await expect(profileTimeZoneSelect(page)).toHaveValue(timezone);
    });
    
  test("Заполнение блока о себе", async ({ page }) => {
      const bio = `QA-инженер, изучаю автоматизацию тестирования с JavaScript/playwright. ${Date.now()}`;
      await profileBioInput(page).fill(bio);
      await profileSaveButton(page).click();
      await page.reload();
      await expect(profileBioInput(page)).toHaveValue(bio);
    });

  test("добавляем навык в профиле", async ({ page }) => {
      const skillTag = `Playwright-demo-${Date.now()}`;
      await profileSkillInput(page).fill(skillTag);
      await profileSkillTypeSelect(page).selectOption("can_help");
      await profileSkillSubmit(page).click();
      
      await expect(profileCanHelpSkills(page)).toContainText(skillTag);
    });


})