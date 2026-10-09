import { test, expect, type Page } from "@playwright/test";

type TestUser = {
  name: string;
  email: string;
  password: string;
};

function makeUser(role: string, runID: number): TestUser {
    return {
        name: `${role}_${runID}Автотест`,
        email: `${role}_${runID}@example.com`,
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
    getProfileSaveButton: () => page.getByRole("button", { name: "Сохранить" })
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

  test.beforeEach(async ({ page }) => {
    user = makeUser("userQA", Date.now());
    await registerUser(page, user);
    await page.goto("/pomidorqa/profile");
  });

  test("смена имени в профиле", async ({ page }) => {
    const newName = `NewName+${Date.now()}`;
    const loc = locators(page);
    await loc.getProfileNameInput().click();
    await loc.getProfileNameInput().fill(newName);
    await expect(loc.getProfileNameInput()).toHaveValue(newName);
  });

  test("смена информации о себе в профиле", async ({ page }) => {
    const about = `Я сегодня съел +${Date.now()}+печенек`;
    const loc = locators(page);
    await loc.getProfileAboutInput().click();
    await loc.getProfileAboutInput().fill(about);
    await loc.getProfileSaveButton().click();
    await expect(loc.getProfileAboutInput()).toHaveValue(about);
  });
});