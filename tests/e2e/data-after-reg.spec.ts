import {test, expect, type Page} from "@playwright/test";

const headerLocators = (page: Page) => ({
    slotsLink: page.getByTestId('PomidorqaHeader-slots-link'),
});

const registerLocators = (page: Page) => ({
    nameInput: page.getByLabel("Имя"),
    emailInput: page.getByLabel("Email"),
    passwordInput: page.getByLabel("Пароль"),
    registerButton: page.getByRole('button', {name: "Зарегистрироваться"}),
});

const profileLocators = (page: Page) => ({
    name: page.getByLabel('Имя'),
    saveButton: page.getByRole('button', {name: "Сохранить"}),
    skillInput: page.getByLabel('Навык'),
    skillType: page.locator("#pomidorqa-profile-skill-type"),
    addButton: page.getByRole('button', {name: 'Добавить'}),
    canHelpSkillsSection: page.getByTestId("can-help-skills"),
})

const slotsLocators = (page: Page) => ({
    dateInput: page.locator("#pomidorqa-slots-date"),
    timeInput: page.locator("#pomidorqa-slots-time"),
    addSlotButton: page.getByRole('button', {name: 'Добавить слот'}),
    firstFreeSlot: page.locator("div[data-slot-status='free']").first(),
})

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
    const register = registerLocators(page);

    await page.goto("/pomidorqa/auth/register");
    await register.nameInput.fill(user.name);
    await register.emailInput.fill(user.email);
    await register.passwordInput.fill(user.password);
    await register.registerButton.click();
    await expect(page).toHaveURL(/\/pomidorqa\/?$/);
}

test.describe("Набор тестов", () => {
    let user: TestUser;
    let runId: number;

    test.beforeEach(async ({page}) => {
        runId = Date.now();
        user = makeUser("user", runId);
        await registerUser(page, user);
        await page.goto("/pomidorqa/profile");

    });

    test("смена имени в профиле", async ({page}) => {
        const profile = profileLocators(page);
        const newName = `Updated ${user.name}`;

        await profile.name.fill(newName);
        await profile.saveButton.click();

        await expect(profile.name).toHaveValue(newName);
    });

    test("добавление навыка", async ({page}) => {
        const profile = profileLocators(page);
        const skillTag = `Skill -${runId}`;

        await profile.skillInput.fill(skillTag);
        await profile.skillType.selectOption("can_help");
        await profile.addButton.click();

        await expect(profile.canHelpSkillsSection).toContainText(skillTag);
    });

    test("добавление слота", async ({page}) => {
        await headerLocators(page).slotsLink.click();

        const slots = slotsLocators(page);
        const tomorrow = new Date(Date.now() + 24 * 60 * 60 * 1000);
        const date = tomorrow.toISOString().slice(0, 10);

        await slots.dateInput.fill(date);
        await slots.timeInput.fill("12:00");
        await slots.addSlotButton.click();

        await expect(slots.firstFreeSlot).toBeVisible();
    });
});
