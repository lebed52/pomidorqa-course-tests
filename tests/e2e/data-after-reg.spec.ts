import {test, expect, type Page} from "@playwright/test";

// Страница профиля
const profileUrl = "/pomidorqa/profile";
// Регистрация локаторы
const registerNameInput = (page: Page) => page.getByLabel("Имя");
const registerEmailInput = (page: Page) => page.getByLabel("Email");
const registerPasswordInput = (page: Page) => page.getByLabel("Пароль");
const profileName = (page: Page) => page.locator("[name='name']");
// Слоты локаторы
const slotsDateInput = (page: Page) => page.locator("#pomidorqa-slots-date");
const slotsTimeInput = (page: Page) => page.locator("#pomidorqa-slots-time");
const slotsCard = (page: Page) => page.locator("[data-slot-id]");
// Профиль локаторы
const profileAddSkillInput = (page: Page) => page.locator("#pomidorqa-profile-skill-input");
const profileAddSkillTypeSelect = (page: Page) => page.locator("#pomidorqa-profile-skill-type");
const profileCanHelpSkills = (page: Page) => page.getByTestId("can-help-skills");

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

test.describe("свой мир на каждый тест", () => {
    let runId: number;
    let user: TestUser;
    let skillTag: string;
    let date: string;

    test.beforeEach(async ({page}) => {
        runId = Date.now();
        user = makeUser("test-user", runId);
        skillTag = `Playwright-demo-${runId}`;
        const tomorrow = new Date(Date.now() + 24 * 60 * 60 * 1000);
        date = tomorrow.toISOString().slice(0, 10);
        await registerUser(page, user);
        await page.goto(profileUrl);
    });

    test("мир 1: Профиль: смена имени", async ({page}) => {
        const newName = `newName-${runId}`;
        await profileName(page).clear();
        await profileName(page).fill(newName);
        await expect(profileName(page)).toHaveValue(newName);
    });

    test("мир 2: Профиль: добавление навыка", async ({page}) => {
        await profileAddSkillInput(page).fill(skillTag);
        await profileAddSkillTypeSelect(page).selectOption("can_help");
        await clickButtonByName(page, "Добавить");
        await expect(profileCanHelpSkills(page).first()).toContainText(skillTag);
    });

    test("мир 3: Профиль: добавление слота", async ({page}) => {
        await page.goto(`${profileUrl}/slots`);
        await slotsDateInput(page).fill(date);
        await slotsTimeInput(page).fill("12:00");
        await clickButtonByName(page, "Добавить слот");
        await expect(slotsCard(page).first()).toBeVisible();
    });
});
