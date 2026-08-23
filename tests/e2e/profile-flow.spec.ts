import { test, expect, type Page } from "@playwright/test";

type TestUser = {
  // поля тестового пользователя
  name: string;
  email: string;
  password: string;
};

function makeUser(role: string, runId: number): TestUser {
  return {
    name: `${role} Автотест ${runId}`,
    email: `${role}-${runId}@example.com`,
    password: "testpass1234",
  };
}

// Pages
const startPage = "/pomidorqa/auth/register";
const profilePage = "/pomidorqa/profile";

// helpers


//register
const registerNameInput = (page: Page) => page.getByLabel("Имя");
const registerEmailInput = (page: Page) => page.getByLabel("Email");
const registerPasswordInput = (page: Page) => page.getByLabel("Пароль");
const registerSubmitButton = (page: Page) => page.getByRole("button", { name: "Зарегистрироваться" });

//profile
const profileNameInput = (page: Page) => page.getByLabel("Имя");
const profileTelegramInput = (page: Page) => page.getByLabel("Telegram");
const profileTimeZoneSelect = (page: Page) => page.getByLabel("Часовой пояс");
const profileAboutInput = (page: Page) => page.getByLabel("О себе");
const profileSaveButton = (page: Page) => page.getByRole("button", { name: "Сохранить" });
const profileSlillsInput = (page: Page) => page.getByLabel("Навык");
const profileSkillTipeSelect = (page: Page) => page.getByLabel("Тип");
const profileAddSkillButton = (page: Page) => page.getByRole("button", { name: "Добавить" });
const profileCanHelpSkills = (page: Page) => page.getByTestId("can-help-skills");


async function registerUser(page: Page, user: TestUser) {
  await page.goto(startPage);
  await registerNameInput(page).fill(user.name);
  await registerEmailInput(page).fill(user.email);
  await registerPasswordInput(page).fill(user.password);
  await registerSubmitButton(page).click();
  await expect(page).toHaveURL(/\/pomidorqa\/?$/);
}

test.describe("Пять проверок в профиле", () => {
  
  test.beforeEach(async ({ page }) => {
    const runId = Date.now();
    const user = makeUser("peace", runId);
    await registerUser(page, user);
    await page.goto(profilePage);
  });

  test("Тест1: Изменение имени пользователя в профиле", async ({ page }) => {
    const NewName = `Новое имя ${Date.now()}`;
    await profileNameInput(page).fill(NewName);
    await profileSaveButton(page).click();
    await expect(profileNameInput(page)).toHaveValue(NewName);
  });

  test("Тест 2: Добавление Telegram", async ({ page }) => {
    const Telegram = `@telegram ${Date.now()}`;
    await profileTelegramInput(page).fill(Telegram);
    await profileSaveButton(page).click();
    await expect(profileTelegramInput(page)).toHaveValue(Telegram);
  });

  test("Тест 3:  Указание часового пояса", async ({ page }) => {
    await profileTimeZoneSelect(page).selectOption("Asia/Vladivostok");
    await profileSaveButton(page).click();
    await page.reload();
    await expect(profileTimeZoneSelect(page)).toHaveValue("Asia/Vladivostok");
  });

  test("Тест 4: Заполнение блока О себе", async ({ page }) => {
    const About = `О себе ${Date.now()}`;
    await profileAboutInput(page).fill(About);
    await profileSaveButton(page).click();
    await page.reload();
    await expect(profileAboutInput(page)).toHaveValue(About);
  });

  test("Тест 5: Добавление нового навыка", async ({ page }) => {
    const SkillTag = `Навык ${Date.now()}`;
    await profileSlillsInput(page).fill(SkillTag);
    await profileSkillTipeSelect(page).selectOption("can_help");
    await profileAddSkillButton(page).click();
    await expect(profileCanHelpSkills(page)).toContainText(SkillTag);
  });
});