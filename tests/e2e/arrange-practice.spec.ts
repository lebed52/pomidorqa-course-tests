import { test, expect, type Page } from "@playwright/test";

const routes = {
    register: "/pomidorqa/auth/register",
    profile: "/pomidorqa/profile",
    slots: "/pomidorqa/profile/slots",
};

const locators = (page: Page) => ({

    registerNameInput: page.getByLabel("Имя"),
    registerEmailInput: page.getByLabel("Email"),
    registerPasswordInput: page.getByLabel("Пароль"),
    registerSubmitButton: page.getByRole("button", { name: "Зарегистрироваться" }),

    profileNameInput: page.getByLabel("Имя"),
    profileButtonSubmit: page.getByRole("button", {name: "Сохранить"}),

    getProfileName: page.getByLabel("Имя"),

    profileSkillInput: page.locator("#pomidorqa-profile-skill-input"),
    profileSkillTypeSelect: page.locator("#pomidorqa-profile-skill-type"),
    profileSkillSubmit: page.getByRole("button", { name: "Добавить" }),
    profileCanHelpSkills: page.getByTestId("can-help-skills"),

    slotsDateInput: page.locator("#pomidorqa-slots-date"),
    slotsTimeInput: page.locator("#pomidorqa-slots-time"),
    slotsAddSubmit: page.getByRole("button", { name: "Добавить слот" }),
    slotsCard: page.locator("[data-slot-id]"),
});

type TestUser = {
    name: string;
    email: string;
    password: string;
};

function makeUser(): TestUser {
    const runId = Date.now();

    return {
        name: `Автотест-${runId}`,
        email: `${runId}@example.com`,
        password: "testpass123",
    }
}

function changeUserName(oldName: string) {

    return {
        newName: `newName-${oldName}`
    }
}

function skillGenerator() {
    return {
        tag: `skill-${Date.now()}`
    }
}

function makeSlot() {
    const now = new Date();
    const tomorrow = new Date(Date.now() + 24 * 60 * 60 * 1000);

    const hours = String(now.getHours()).padStart(2, "0");
    const minutes = String(now.getMinutes()).padStart(2, "0");

    return {
        date: tomorrow.toISOString().slice(0, 10),
        time: `${hours}:${minutes}`,
    };
}

async function registerUser(page: Page, user: TestUser) {
    const elements = locators(page);

    await page.goto(routes.register);
    await elements.registerNameInput.fill(user.name);
    await elements.registerEmailInput.fill(user.email);
    await elements.registerPasswordInput.fill(user.password);
    await elements.registerSubmitButton.click();
    await expect(page).toHaveURL(/\/pomidorqa\/?$/);
}

test.describe("Прогон теста с новым юзером", () => {
    let guest3: TestUser;

    test.beforeEach("Регистрируем нового пользователя и переходим в профиль", async ({ page }) => {
        guest3 = makeUser();
        await registerUser(page, guest3);
        await page.goto(routes.profile);
    });

    test("Меняем имя пользователя в профиле", async ({ page }) => {
        const elements = locators(page);
        const changedName = changeUserName(guest3.name);

        await elements.profileNameInput.fill(changedName.newName);
        await elements.profileButtonSubmit.click();

        await expect(elements.getProfileName).toHaveValue(changedName.newName)

    });

    test("Добавляем пользователю навык", async ({ page }) => {
        const elements = locators(page);
        const newSkill = skillGenerator()

        await elements.profileSkillInput.fill(newSkill.tag);
        await elements.profileSkillTypeSelect.selectOption("can_help");
        await elements.profileSkillSubmit.click();
        await expect(elements.profileCanHelpSkills).toContainText(newSkill.tag);
    });

    test("Добавляем пользователю слот", async ({ page }) => {
        const elements = locators(page);

        await page.goto(routes.slots);
        const slot = makeSlot()

        await elements.slotsDateInput.fill(slot.date);
        await elements.slotsTimeInput.fill(slot.time);
        await elements.slotsAddSubmit.click();
        await expect(elements.slotsCard.first()).toBeVisible();
    });
});