import {test, expect, type Page} from "@playwright/test";

// Страница профиля
const profileUrl = "/pomidorqa/profile";
// Регистрация локаторы
const registerNameInput = (page: Page) => page.getByLabel("Имя");
const registerEmailInput = (page: Page) => page.getByLabel("Email");
const registerPasswordInput = (page: Page) => page.getByLabel("Пароль");
// Профиль локаторы
const profileNameInput = (page: Page) => page.getByLabel("Имя");
const profileTelegramUserName = (page: Page) => page.getByLabel("Telegram");
const profileTimeZoneSelect = (page: Page) => page.getByLabel("Часовой пояс");
const profileBioInput = (page: Page) => page.getByLabel("О себе");
const profileAddSkillInput = (page: Page) => page.locator("#pomidorqa-profile-skill-input");
const profileAddSkillTypeSelect = (page: Page) => page.locator("#pomidorqa-profile-skill-type");
const profileCanHelpSkills = (page: Page) => page.getByTestId("can-help-skills");
const profileCanHelpSkill = (page: Page, skillTag: string) => profileCanHelpSkills(page).locator(`[data-skill-tag="${skillTag}"]`);
const profileCanHelpSkillRemove = (page: Page) => profileCanHelpSkills(page).locator("[title='Убрать']");

// Функция-хелпер
async function clickButtonByName(page: Page, name: string) {
    await page.getByRole("button", {name, exact: true}).click();
}

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
    await clickButtonByName(page, "Зарегистрироваться");
    await expect(page).toHaveURL(/\/pomidorqa\/?$/);
}

test.describe("Профиль: проверка полей", () => {
    let runId: number;
    let user: TestUser;
    let skillTag: string;

    test.beforeEach(async ({page}) => {
        runId = Date.now();
        user = makeUser("test-user", runId);
        skillTag = `Playwright-demo-${runId}`;
        await registerUser(page, user);
        await page.goto(profileUrl);
    });

    test("Смена имени", async ({page}) => {
        const newName = `newName-${runId}`;
        await profileNameInput(page).fill(newName);
        await clickButtonByName(page, "Сохранить");
        await expect(profileNameInput(page)).not.toHaveValue(user.name);
        await expect(profileNameInput(page)).toHaveValue(newName);
    });

    test("Добавление телеграмма", async ({page}) => {
        const telegramUserName = `@${runId}`
        await profileTelegramUserName(page).fill(telegramUserName);
        await clickButtonByName(page, "Сохранить");
        await expect(profileTelegramUserName(page)).toHaveValue(telegramUserName);
    });

    test("Добавление навыка", async ({page}) => {
        await profileAddSkillInput(page).fill(skillTag);
        await profileAddSkillTypeSelect(page).selectOption("can_help");
        await clickButtonByName(page, "Добавить");
        await expect(profileCanHelpSkills(page).first()).toContainText(skillTag);
    });

    test("Изменение таймзоны", async ({page}) => {
        await profileTimeZoneSelect(page).selectOption("Asia/Vladivostok");
        await clickButtonByName(page, "Сохранить");
        await expect(profileTimeZoneSelect(page)).toHaveValue("Asia/Vladivostok");
    });

    test("Добавление информации 'О себе'", async ({page}) => {
        const profileBioInfo = `Багов найдено ${runId}`;
        await profileBioInput(page).fill(profileBioInfo);
        await clickButtonByName(page, "Сохранить");
        await expect(profileBioInput(page)).toHaveValue(profileBioInfo);
    });

    test("Удаление единственного навыка", async ({page}) => {
        await test.step("Добавляем навык", async () => {
            await profileAddSkillInput(page).fill(skillTag);
            await profileAddSkillTypeSelect(page).selectOption("can_help");
            await clickButtonByName(page, "Добавить");
            await expect(profileCanHelpSkills(page).first()).toContainText(skillTag);
        });

        await test.step("Удаляем навык", async () => {
            await profileCanHelpSkillRemove(page).click();
            await expect(profileCanHelpSkills(page)).not.toBeVisible();
        });
    });

    test("Форма с пустым именем не отправляется", async ({page}) => {
        await profileNameInput(page).clear();
        await clickButtonByName(page, "Сохранить");
        await page.reload();
        await expect(profileNameInput(page)).toHaveValue(user.name);
    });

    test("Не создается дубликат навыка", async ({page}) => {
        await test.step("Добавляем навык первый раз", async () => {
            await profileAddSkillInput(page).fill(skillTag);
            await profileAddSkillTypeSelect(page).selectOption("can_help");
            await clickButtonByName(page, "Добавить");
        });

        await test.step("Добавляем такой же навык второй раз", async () => {
            await profileAddSkillInput(page).fill(skillTag);
            await profileAddSkillTypeSelect(page).selectOption("can_help");
            await clickButtonByName(page, "Добавить");
        });

        await test.step("Проверяем, что дублика не создался", async () => {
            await expect(profileCanHelpSkill(page, skillTag)).toHaveCount(1);
        });
    });
});
