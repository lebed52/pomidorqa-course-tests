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

//фабрика локаторов
const registerNameInput = (page: Page) => page.getByLabel("Имя");
const registerEmailInput = (page: Page) => page.getByLabel("Email");
const registerPasswordInput = (page: Page) => page.getByLabel("Пароль");
const registerSubmitButton = (page: Page) => page.getByRole("button", { name: "Зарегистрироваться" });

const profileUsernameInput = (page: Page) => page.getByRole('textbox', { name: 'Имя' });
const profileTelegramTagInput = (page: Page) => page.getByLabel('Telegram');
const profileTimeZoneSelect = (page: Page) => page.getByLabel('Часовой пояс');
const profileAboutMeInput = (page: Page) => page.getByLabel('О себе');
const profileSaveButton = (page: Page) => page.getByRole('button', { name: 'Сохранить' });

const profileSkillInput = (page: Page) => page.getByRole('textbox', { name: 'Навык' });
const profileSkillTypeSelect = (page: Page) => page.locator("#pomidorqa-profile-skill-type");
const profileSkillSubmit = (page: Page) => page.getByRole("button", { name: "Добавить" });
const profileCanHelpSkills = (page: Page) => page.getByTestId("can-help-skills");

async function registerUser(page: Page, user: TestUser) {
    await page.goto("/pomidorqa/auth/register");
    await registerNameInput(page).fill(user.name);
    await registerEmailInput(page).fill(user.email);
    await registerPasswordInput(page).fill(user.password);
    await registerSubmitButton(page).click();
    await expect(page).toHaveURL(/\/pomidorqa\/?$/);
}

test.describe("Тесты всех полей в профиле после регистрации", () => {
    let user: TestUser;

    test.beforeEach(async ({ page }) => {
        user = makeUser("student", Date.now());
        await registerUser(page, user);
        await page.goto("/pomidorqa/profile");
    });

    test("Смена имени в профиле", async ({ page }) => {
        const newName = `${user.name} Jr`;

        await test.step("Заполняем новое имя и сохраняем", async () => {
            await profileUsernameInput(page).fill(newName);
            await profileSaveButton(page).click();

            await expect(profileUsernameInput(page)).toHaveValue(newName);
        });
    });

    test("Добавляем телеграм тэг в профиль", async ({ page }) => {
        const telegramTag = `@student${Date.now()}`;

        await test.step("Заполняем телеграм тэг и сохраняем", async () => {
            await profileTelegramTagInput(page).fill(telegramTag);
            await profileSaveButton(page).click();

            await expect(profileTelegramTagInput(page)).toHaveValue(telegramTag);
        });
    });

    test("Выбираем часовой пояс", async ({ page }) => {
        await test.step("Выбираем часовой пояс Asia/Omsk", async () => {
            await profileTimeZoneSelect(page).selectOption('Asia/Omsk');
            await profileSaveButton(page).click();

            await expect(profileTimeZoneSelect(page)).toHaveValue('Asia/Omsk');
        });
    });

    test("Заполняем информацию о себе", async ({ page }) => {
        const aboutMe = `Автотест профиля - ${Date.now()}`;

        await test.step("Вводим текст в поле о себе и сохраняем", async () => {
            await profileAboutMeInput(page).fill(aboutMe);
            await profileSaveButton(page).click();

            await expect(profileAboutMeInput(page)).toHaveValue(aboutMe);
        });
    });

    test("Добавление навыка могу помочь в профиле", async ({ page }) => {
        const skillTag = `Playwright-demo-${Date.now()}`;

        await test.step("Добавление навыка", async () => {
            await profileSkillInput(page).fill(skillTag);
            await profileSkillTypeSelect(page).selectOption("can_help");
            await profileSkillSubmit(page).click();

            await expect(profileCanHelpSkills(page)).toContainText(skillTag);
        });
    });
});