import { test, expect, type Page } from "@playwright/test";

type TestUser = {
    name: string;
    email: string;
    password: string;
  };

  const registerNameInput = (page: Page) => page.getByLabel("Имя");
  const registerEmailInput = (page: Page) => page.getByLabel("Email");
  const registerPasswordInput = (page: Page) => page.getByLabel("Пароль");
  const registerSubmitButton = (page: Page) => page.getByRole("button", { name: "Зарегистрироваться" });
  
  const profileNameInput = (page: Page) => page.getByLabel("Имя");
  const profileSaveButton = (page: Page) => page.getByRole("button", { name: "Сохранить" });
  const profileTelegramInput = (page: Page) => page.getByLabel("Telegram");
  const profileTimezoneSelect = (page: Page) => page.locator('[name="timezone"]');
  const profileAboutInput = (page: Page) => page.getByLabel("О себе");

  const skillInput = (page: Page) => page.locator("#pomidorqa-profile-skill-input");
  const skillTypeSelect = (page: Page) => page.locator("#pomidorqa-profile-skill-type");
  const addSkillButton = (page: Page) => page.getByRole("button", { name: "Добавить" });
  const canHelpSkills = (page: Page) => page.getByTestId("can-help-skills");
  
  function makeUser(role:string, runId:number): TestUser {
    return {
      name: `${role} na pive`,
      email: `${role}-${runId}@example.com`,
      password: "password123",
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

  test.describe("Проведение практики", () => {
    let user: TestUser;

    test.beforeEach(async ({ page }) => {
        const runId = Date.now();
        user = makeUser("Jango", runId);
        await registerUser(page, user);
        await page.goto("/pomidorqa/profile");
        await expect(page).toHaveURL(/\/pomidorqa\/profile/);
    });

    test("Смена имени", async ({ page }) => {
        const newName = "Jango Fett";
        await profileNameInput(page).fill(newName);
        await profileSaveButton(page).click();
        await expect(profileNameInput(page)).toHaveValue(newName);
    });

    test("Заполнение поля telegram", async ({ page }) => {
        const telegram = "@jangofett";
        await profileTelegramInput(page).fill(telegram);
        await profileSaveButton(page).click();
        await expect(profileTelegramInput(page)).toHaveValue(telegram);
    });

    test("Изменение часового пояса", async ({ page }) => {
       await profileTimezoneSelect(page).selectOption("Asia/Yekaterinburg");
       await profileSaveButton(page).click();
       await expect(profileTimezoneSelect(page)).toHaveValue("Asia/Yekaterinburg");
    });

    test("Добавление информации о себе", async ({ page }) => {
        const about = "I'm a Jedi"
        await profileAboutInput(page).fill(about);
        await profileSaveButton(page).click();
        await expect(profileAboutInput(page)).toHaveValue(about);
    });

    test("Добавление навыка", async ({ page }) => {
        const skillName = "Brainfuck";
        await skillInput(page).fill(skillName);
        await skillTypeSelect(page).selectOption("can_help");
        await addSkillButton(page).click();
        await expect(canHelpSkills(page)).toContainText(skillName);
    });
});
