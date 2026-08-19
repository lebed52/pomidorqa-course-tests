import { expect, test, type Page } from "@playwright/test";

type TestUser = {
  name: string;
  email: string;
  password: string;
};

const registerLocators = (page: Page) => ({
  nameInput: page.getByLabel("Имя", { exact: true }),
  emailInput: page.getByLabel("Email", { exact: true }),
  passwordInput: page.locator('input[type="password"]'),
  submitButton: page.getByRole("button", { name: "Зарегистрироваться" }),
});

const profileLocators = (page: Page) => ({
  nameInput: page.getByLabel("Имя", { exact: true }),
  saveButton: page.getByRole("button", { name: "Сохранить" }),
  skillInput: page.getByLabel("Навык", { exact: true }),
  skillTypeSelect: page.getByRole("combobox", { name: "Тип" }),
  addSkillButton: page.getByRole("button", { name: "Добавить" }),
  skillChip: (skill: string) => page.getByRole("button", { name: `${skill} ×`, exact: true }),
});

const slotsLocators = (page: Page) => ({
  dateInput: page.getByRole("textbox", { name: "Дата" }),
  timeInput: page.getByRole("textbox", { name: "Время начала" }),
  addButton: page.getByRole("button", { name: "Добавить слот" }),
  slotsSection: page.locator("main"),
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
  await Promise.all([
    page.waitForURL(/\/pomidorqa\/?$/),
    register.submitButton.click(),
  ]);
}

test.describe("данные после регистрации", () => {
  let user: TestUser;

  test.beforeEach(async ({ page }) => {
    user = makeUser();
    await registerUser(page, user);
    await page.goto("/pomidorqa/profile");
  });

  test("смена имени в профиле", async ({ page }) => {
    // Arrange
    const newName = `${user.name} updated`;
    const profile = profileLocators(page);

    // Act
    await profile.nameInput.fill(newName);
    await profile.saveButton.click();

    // Assert
    await expect(profile.nameInput).toHaveValue(newName);
  });

  test("добавление навыка", async ({ page }, testInfo) => {
    // Arrange
    const skill = `Playwright-${testInfo.testId}-${Date.now()}`;
    const profile = profileLocators(page);

    // Act
    await profile.skillInput.fill(skill);
    await profile.skillTypeSelect.selectOption("can_help");
    await profile.addSkillButton.click();

    // Assert
    await expect(profile.skillChip(skill)).toBeVisible();
  });

  test("добавление слота", async ({ page }) => {
    // Arrange
    const slotDate = new Date();
    slotDate.setDate(slotDate.getDate() + 1);
    const date = slotDate.toISOString().slice(0, 10);
    const slots = slotsLocators(page);

    await page.goto("/pomidorqa/profile/slots");

    // Act
    await slots.dateInput.fill(date);
    await slots.timeInput.fill("12:00");
    await slots.addButton.click();

    // Assert
    await expect(slots.slotsSection).toContainText("12:00");
  });
});
