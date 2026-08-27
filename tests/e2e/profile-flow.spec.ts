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
const profileSkillTypeSelect = (page: Page) => page.getByLabel('Тип');
const profileSkillSubmit = (page: Page) => page.getByRole("button", { name: "Добавить" });
const profileCanHelpSkills = (page: Page) => page.getByTestId("can-help-skills");

const profileSkillChipByTag = (page: Page, skillTag: string) => page.locator(`[data-skill-tag="${skillTag}"]`);
const profileSkillChips = (page: Page) => page.locator('[data-skill-tag]');

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

        await profileUsernameInput(page).fill(newName);
        await profileSaveButton(page).click();

        await test.step("Проверяем имя добавлено", async () => {
            await expect(profileUsernameInput(page)).toHaveValue(newName);
        });
    });

    test("Добавляем телеграм тэг в профиль", async ({ page }) => {
        const telegramTag = `@student${Date.now()}`;

        await profileTelegramTagInput(page).fill(telegramTag);
        await profileSaveButton(page).click();

        await test.step("Проверяем телеграм добавлен", async () => {
            await expect(profileTelegramTagInput(page)).toHaveValue(telegramTag);
        });
    });

    test("Выбираем часовой пояс", async ({ page }) => {
        await profileTimeZoneSelect(page).selectOption('Asia/Omsk');
        await profileSaveButton(page).click();

        await test.step("Проверяем часовой пояс", async () => {
            await expect(profileTimeZoneSelect(page)).toHaveValue('Asia/Omsk');
        });
    });

    test("Заполняем информацию о себе", async ({ page }) => {
        const aboutMe = `Автотест профиля - ${Date.now()}`;

        await profileAboutMeInput(page).fill(aboutMe);
        await profileSaveButton(page).click();

        await test.step("Проверяем информация о себе добавлена", async () => {
            await expect(profileAboutMeInput(page)).toHaveValue(aboutMe);
        });
    });

    test("Добавление навыка могу помочь в профиле", async ({ page }) => {
        const skillTag = `Playwright-demo-${Date.now()}`;

        await profileSkillInput(page).fill(skillTag);
        await profileSkillTypeSelect(page).selectOption("can_help");
        await profileSkillSubmit(page).click();

        await test.step("Проверяем навык могу помочь добавлен", async () => {
            await expect(profileCanHelpSkills(page)).toContainText(skillTag);
        });
    });

    test("Негативная проверка: удаляем навык хочу разобрать в профиле", async ({ page }) => {
        const skillTag = `Playwright-demo-${Date.now()}`;
        await test.step("Добавляем навыка хочу разобрать", async () => {
            await profileSkillInput(page).fill(skillTag);
            await profileSkillTypeSelect(page).selectOption("want_to_learn");
            await profileSkillSubmit(page).click();
        });

        await test.step("Удаляем навык хочу разобрать", async () => {
            await profileSkillChipByTag(page, skillTag).click();
        });

        await test.step("Проверяем навык хочу разобрать удален", async () => {
            await expect(profileSkillChipByTag(page, skillTag)).not.toBeVisible();
        });
    });

    test("Все поля профиля сохраняются одним нажатием «Сохранить»", async ({ page }) => {
        const newName = `${user.name} Jr`;
        const telegramTag = `@student${Date.now()}`;
        const aboutMe = `Автотест профиля - ${Date.now()}`;

        await test.step("Заполняем имя, телеграм, часовой пояс, о себе, сохраняем", async () => {
            await profileUsernameInput(page).fill(newName);
            await profileTelegramTagInput(page).fill(telegramTag);
            await profileTimeZoneSelect(page).selectOption('Asia/Omsk');
            await profileAboutMeInput(page).fill(aboutMe);
            const saveResponse = page.waitForResponse(
                (r) => r.url().includes("/pomidorqa/profile") && r.request().method() === "POST"
            );
            await profileSaveButton(page).click();
            await saveResponse;
        });

        await test.step("Перезагружаем страницу, проверяем, все поля сохранились", async () => {
            await page.reload();
            await expect.soft(profileUsernameInput(page)).toHaveValue(newName);
            await expect.soft(profileTelegramTagInput(page)).toHaveValue(telegramTag);
            await expect.soft(profileTimeZoneSelect(page)).toHaveValue('Asia/Omsk');
            await expect.soft(profileAboutMeInput(page)).toHaveValue(aboutMe);
        });
    });

    test("Проверяем количество часовых поясов = 10", async ({ page }) => {
        await expect(profileTimeZoneSelect(page).locator('option')).toHaveCount(10);
    });

    test("Проверка на добавление пустого навыка могу помочь в профиле", async ({ page }) => {
        await test.step("Добавляем навык могу помочь, чтобы было от чего отталкиваться", async () => {
            const skillTag = `Playwright-demo-${Date.now()}`;
            await profileSkillInput(page).fill(skillTag);
            await profileSkillTypeSelect(page).selectOption("can_help");
            await profileSkillSubmit(page).click();
            await expect(profileSkillChips(page)).toHaveCount(1);
        });

        await test.step("Добавляем пустое поле в навык могу помочь", async () => {
            await profileSkillSubmit(page).click();
        });

        await test.step("Навыков по-прежнему один, пустой не добавился", async () => {
            await expect(profileSkillInput(page)).toBeFocused();
            await expect(profileSkillChips(page)).toHaveCount(1);
        });
    });
});