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

function toDateInputValue(d: Date): string {
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, "0");
    const day = String(d.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
}

//фабрика локаторов
const registerNameInput = (page: Page) => page.getByLabel("Имя");
const registerEmailInput = (page: Page) => page.getByLabel("Email");
const registerPasswordInput = (page: Page) => page.getByLabel("Пароль");
const registerSubmitButton = (page: Page) => page.getByRole("button", { name: "Зарегистрироваться" });

const profileUsername = (page: Page) => page.getByRole('textbox', { name: 'Имя' });
const profileSaveButton = (page: Page) => page.getByRole('button', { name: 'Сохранить' });

const profileSkillInput = (page: Page) => page.getByRole('textbox', { name: 'Навык' });
const profileSkillTypeSelect = (page: Page) => page.locator("#pomidorqa-profile-skill-type");
const profileSkillSubmit = (page: Page) => page.getByRole("button", { name: "Добавить" });
const profileCanHelpSkills = (page: Page) => page.getByTestId("can-help-skills");

const slotsDateInput = (page: Page) => page.locator("#pomidorqa-slots-date");
const slotsTimeInput = (page: Page) => page.locator("#pomidorqa-slots-time");
const slotsAddSubmit = (page: Page) => page.getByRole("button", { name: "Добавить слот" });
const slotsCard = (page: Page) => page.locator("[data-slot-id]");

async function registerUser(page: Page, user: TestUser) {
    await page.goto("/pomidorqa/auth/register");
    await registerNameInput(page).fill(user.name);
    await registerEmailInput(page).fill(user.email);
    await registerPasswordInput(page).fill(user.password);
    await registerSubmitButton(page).click();
    await expect(page).toHaveURL(/\/pomidorqa\/?$/);
}

test.describe("Тесты в профиле после регистрации", () => {
    let user: TestUser;

    test.beforeEach(async ({ page }) => {
        user = makeUser("student", Date.now());
        await registerUser(page, user);
        await page.goto("/pomidorqa/profile");
    });

    test.afterEach(async ({ page }) => {
        await page.close();
    });

    test("Смена имени в профиле", async ({ page }) => {
        const newName = `${user.name} Jr`;

        await test.step("Заполняем новое имя и сохраняем", async () => {
            await profileUsername(page).fill(newName);
            await profileSaveButton(page).click();

            await expect(async () => {
                await page.reload();
                await expect(profileUsername(page)).toHaveValue(newName);
            }).toPass({ timeout: 10_000 });
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

    test("Добавление слота в Мои слоты", async ({ page }) => {
        await test.step("Идем в мои слоты и добавляем слот на завтра", async () => {
            await page.goto("/pomidorqa/profile/slots");
            const tomorrow = new Date(Date.now() + 24 * 60 * 60 * 1000);
            const date = toDateInputValue(tomorrow);

            await slotsDateInput(page).fill(date);
            await slotsTimeInput(page).fill("12:00");
            await slotsAddSubmit(page).click();

            await expect(slotsCard(page).first()).toBeVisible();
        });
    });
});