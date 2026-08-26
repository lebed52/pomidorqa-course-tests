import { expect, test, type Page } from "@playwright/test";

type TestUser = {
    name: string;
    email: string;
    password: string;
};

const SKILL_TYPES = {
    CAN_HELP: "can_help",
    WANT_TO_LEARN: "want_to_learn",
} as const;

const registerLocators = (page: Page) => ({
    nameInput: page.getByLabel("Имя", { exact: true }),
    emailInput: page.getByLabel("Email", { exact: true }),
    passwordInput: page.locator('input[type="password"]'),
    submitButton: page.getByRole("button", { name: "Зарегистрироваться" }),
});

const profileLocators = (page: Page) => ({
    nameInput: page.getByLabel("Имя", { exact: true }),
    telegramInput: page.getByLabel("Telegram", { exact: true }),
    timezoneSelect: page.getByRole("combobox", { name: "Часовой пояс" }),
    bioTextarea: page.getByLabel("О себе", { exact: true }),
    saveButton: page.getByRole("button", { name: "Сохранить" }),
    skillInput: page.getByLabel("Навык", { exact: true }),
    skillTypeSelect: page.getByRole("combobox", { name: "Тип" }),
    addSkillButton: page.getByRole("button", { name: "Добавить" }),
    skillChips: page.locator("[data-skill-tag]"),
    skillChip: (skill: string) => page.getByRole("button", { name: `${skill} ×`, exact: true }),
});

function makeUser(): TestUser {
    const runId = Date.now();

    return {
        name: `Profile Check ${runId}`,
        email: `profile-check-${runId}@example.com`,
        password: "testpass123",
    };
}

async function registerUser(page: Page, user: TestUser) {
    const register = registerLocators(page);

    await page.goto("/pomidorqa/auth/register");
    await register.nameInput.fill(user.name);
    await register.emailInput.fill(user.email);
    await register.passwordInput.fill(user.password);
    await register.submitButton.click()
    await page.waitForURL(/\/pomidorqa\/?$/)
}

test.beforeEach(async ({ page }) => {
    const user = makeUser();
    await registerUser(page, user);
    await page.goto("/pomidorqa/profile");
});

test("смена имени в профиле", async ({ page }) => {
    // Arrange
    const newName = "Сэр Баголов";
    const profile = profileLocators(page);

    // Act
    await profile.nameInput.fill(newName);
    await profile.saveButton.click();

    // Assert
    await expect(profile.nameInput).toHaveValue(newName);
});

test("сохранение Telegram в профиле", async ({ page }) => {
    // Arrange
    const telegram = "@bug_tamer";
    const profile = profileLocators(page);

    // Act
    await profile.telegramInput.fill(telegram);
    await profile.saveButton.click();

    // Assert
    await expect(profile.telegramInput).toHaveValue(telegram);
});

test("сохранение часового пояса в профиле", async ({ page }) => {
    // Arrange
    const timezone = "Asia/Yekaterinburg";
    const profile = profileLocators(page);

    // Act
    await profile.timezoneSelect.selectOption(timezone);
    await profile.saveButton.click();

    // Assert
    await expect(profile.timezoneSelect).toHaveValue(timezone);
});

test("сохранение информации о себе", async ({ page }) => {
    // Arrange
    const bio = "Днём укрощаю баги, ночью убеждаю автотесты, что они стабильные.";
    const profile = profileLocators(page);

    // Act
    await profile.bioTextarea.fill(bio);
    await profile.saveButton.click();

    // Assert
    await expect(profile.bioTextarea).toHaveValue(bio);
});

test("негативный сценарий: удаление навыка из списка", async ({ page }) => {
    // Arrange
    const skill = "Укрощение багов";
    const profile = profileLocators(page);
    const skillChip = profile.skillChip(skill);

    // Act
    await profile.skillInput.fill(skill);
    await profile.skillTypeSelect.selectOption(SKILL_TYPES.CAN_HELP);
    await profile.addSkillButton.click();

    // Assert
    await expect(skillChip).toBeVisible();

    // Act
    await skillChip.click();

    // Assert
    await expect(skillChip).not.toBeVisible();
});

test("нельзя сохранить профиль с пустым именем", async ({ page }) => {
    // Arrange
    const profile = profileLocators(page);

    // Act
    await profile.nameInput.clear();
    await profile.saveButton.click();

    // Assert
    await expect(profile.nameInput).toBeFocused();
    await expect(profile.nameInput).toHaveValue("");
});

test("нельзя добавить навык без названия", async ({ page }) => {
    // Arrange
    const profile = profileLocators(page);
    const skillCount = await profile.skillChips.count();

    // Act
    await profile.skillInput.clear();
    await profile.addSkillButton.click();

    // Assert
    await expect(profile.skillInput).toBeFocused();
    await expect(profile.skillInput).toHaveValue("");
    await expect(profile.skillChips).toHaveCount(skillCount);
});
