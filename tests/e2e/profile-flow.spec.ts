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
      page.waitForResponse(response => response.status() === 200), // ждем любой успешный ответ 200
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
      page.waitForResponse(response => response.status() === 200), // ждем любой успешный ответ 200
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
      page.waitForResponse(response => response.status() === 200), // ждем любой успешный ответ 200
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
      page.waitForResponse((res) => res.status() === 200),
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
      page.waitForResponse(response => response.status() === 200), // ждем любой успешный ответ 200
      loc.getProfileSkilladdButton().click(),
    ]);
    await page.reload();

    await expect(loc.getProfileSkillTag(skillTag)).toContainText(skillTag);
  })
});