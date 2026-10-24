import { test, expect, type Page } from "@playwright/test";

type TestUser = {
  name: string;
  email: string;
  password: string;
};

function makeUser(role: string, runID: number): TestUser {
    return {
        name: `${role}${runID}QA`,
        email: `${role}${runID}@example.com`,
        password: "testpass123",
    };
}

const locators = (page: Page) => ({
    getRegisterNameInput: () => page.locator("#pomidorqa-register-name"),
    getRegisterEmailInput: () => page.locator("#pomidorqa-register-email"),
    getRegisterPasswordInput: () => page.locator("#pomidorqa-register-password"),
    getRegisterSubmitButton: () => page.getByRole("button", { name: "Зарегистрироваться" }),
    
    getProfileNameInput: () => page.getByRole("textbox", { name: "Имя" }),
    getProfileAboutInput: () => page.getByRole("textbox", { name: "О себе" }),
    getProfileSaveButton: () => page.getByRole("button", { name: "Сохранить" }),

    getProfileTelegramInput: () => page.getByLabel("Telegram"),
    getProfileTimezoneSelect: () => page.getByLabel("Часовой пояс"),

    getProfileSkillInput: () => page.getByLabel("Навык"),
    getProfileSkillTypeSelect: () => page.locator("#pomidorqa-profile-skill-type"),
    getProfileSkilladdButton: () => page.getByRole("button", { name: "Добавить"}),
    getProfileSkillTag: (tag: string) => page.locator(`[data-skill-tag="${tag}"]`),
    getProfileSkillSectionType: (type: "can_help" | "want_to_learn") => page.locator(`[data-skills="${type}"] p`),
    getProfileSkillRemoveButton: (tag: string) => page.locator(`[data-skill-tag="${tag}"]`).getByRole("button"),
});


async function registerUser(page: Page, user: TestUser) {
    const loc = locators(page);
    await page.goto("/pomidorqa/auth/register");
    await loc.getRegisterNameInput().fill(user.name);
    await loc.getRegisterEmailInput().fill(user.email);
    await loc.getRegisterPasswordInput().fill(user.password);
    await loc.getRegisterSubmitButton().click();
    await expect(page).toHaveURL(/\/pomidorqa\/?$/);
}

test.describe("свой мир на каждый тест", () => {
  let user: TestUser;
  let loc: ReturnType<typeof locators>;
  let runId: number;
  
  test.beforeEach(async ({ page }) => {
    runId = Date.now();
    user = makeUser("userQA", runId);
    loc = locators(page);
    await registerUser(page, user);
    await page.goto("/pomidorqa/profile");
  });
  
  test("смена имени в профиле", async ({ page }) => {
    const newName = `NewName_${runId}`;

    await loc.getProfileNameInput().click();
    await loc.getProfileNameInput().fill(newName);
    await Promise.all([
      page.waitForResponse(
    (res) =>
      res.url().includes("/pomidorqa/profile") && 
      res.request().method() == "POST"
    ), 
      loc.getProfileSaveButton().click(),
    ]);
    await page.reload();

    await expect(loc.getProfileNameInput()).toHaveValue(newName);
  });

  test("Смена телеграма в профиле", async ({ page }) => {
    const newTelegram = `@NewTelegram_${runId}`;

    await loc.getProfileTelegramInput().click();
    await loc.getProfileTelegramInput().fill(newTelegram);
    await Promise.all([
    page.waitForResponse(
    (res) =>
      res.url().includes("/pomidorqa/profile") && 
      res.request().method() == "POST"
    ), 
      loc.getProfileSaveButton().click(),
    ]);
    await page.reload();

    await expect(loc.getProfileTelegramInput()).toHaveValue(newTelegram);
  })

  test("Смена часового пояса в профиле", async ({ page }) => {
    const select = loc.getProfileTimezoneSelect();
    const options = select.locator("option");
    const count = await options.count();
    const randomIndex = Math.floor(Math.random() * count);
    const randomOption = options.nth(randomIndex);
    const randomValue = await randomOption.getAttribute("value");

    await select.selectOption(randomValue!);
    await Promise.all([
    page.waitForResponse(
    (res) =>
      res.url().includes("/pomidorqa/profile") && 
      res.request().method() == "POST"
    ), 
    loc.getProfileSaveButton().click(),
    ]);
    await page.reload();

    await expect(select).toHaveValue(randomValue!);
  })

  test("Смена информации о себе в профиле", async ({ page }) => {
    const about = `Я сегодня съел +${runId}+печенек`;
    
    await loc.getProfileAboutInput().click();
    await loc.getProfileAboutInput().fill(about);
    await Promise.all([
    page.waitForResponse(
    (res) =>
      res.url().includes("/pomidorqa/profile") && 
      res.request().method() == "POST"
    ), 
    loc.getProfileSaveButton().click(),
    ]);
    await page.reload();

    await expect(loc.getProfileAboutInput()).toHaveValue(about);
  });

  test("Добавление навыка в профиле", async ({ page }) => {
    const skillTag = `Playwright-demo-${runId}`;

    await loc.getProfileSkillInput().fill(skillTag);
    await loc.getProfileSkillTypeSelect().selectOption("want_to_learn");
    await Promise.all([
    page.waitForResponse(
    (res) =>
      res.url().includes("/pomidorqa/profile") && 
      res.request().method() == "POST"
    ),       loc.getProfileSkilladdButton().click(),
    ]);
    await page.reload();

    await expect(loc.getProfileSkillTag(skillTag)).toContainText(skillTag);
  })

  test("Удаление навыка в профиле", async ({ page: _page }) => {
    const skillTag = `Playwright-demo-${runId}`;

    await loc.getProfileSkillInput().fill(skillTag);
    await loc.getProfileSkillTypeSelect().selectOption("want_to_learn");
    await loc.getProfileSkilladdButton().click();
    await loc.getProfileSkillRemoveButton(skillTag).click();

    await expect(loc.getProfileSkillTag(skillTag)).toHaveCount(0);
  })

  test("Не добавляется навык с уже существующим названием", async ({ page: _page }) => {
    const skillTag = `Playwright-demo-${runId}`;

    await loc.getProfileSkillInput().fill(skillTag);
    await loc.getProfileSkillTypeSelect().selectOption("want_to_learn");
    await loc.getProfileSkilladdButton().click();
    await loc.getProfileSkillInput().fill(skillTag);
    await loc.getProfileSkillTypeSelect().selectOption("want_to_learn");
    await loc.getProfileSkilladdButton().click();

    await expect(loc.getProfileSkillTag(skillTag)).toHaveCount(1);
  })

  test("Негатив: Исчезает текст с типом навыка при их удалении", async ({ page: _page }) => {
    const skillTag = `Playwright-demo-${runId}`;

    await loc.getProfileSkillInput().fill(skillTag);
    await loc.getProfileSkillTypeSelect().selectOption("want_to_learn");
    await loc.getProfileSkilladdButton().click();
    await loc.getProfileSkillRemoveButton(skillTag).click();

    await expect(loc.getProfileSkillSectionType("want_to_learn")).not.toBeVisible();
  })

});