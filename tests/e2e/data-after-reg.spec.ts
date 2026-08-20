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
  registerSubmit: page.getByRole("button", { name: "Зарегистрироваться" }),
  profileNameInput: page.getByLabel("Имя"),
  profileNameSubmit: page.getByRole("button", { name: "Сохранить" }),
  profileSkillInput: page.getByLabel("Навык"),
  profileSkillTypeSelect: page.locator("#pomidorqa-profile-skill-type"),
  profileSkillSubmit: page.getByRole("button", { name: "Добавить" }),
  profileCanHelpSkills: page.locator("//button[@data-skill-tag]"),
  slotsDateInput: page.locator("#pomidorqa-slots-date"),
  slotsTimeInput: page.locator("#pomidorqa-slots-time"),
  slotsAddSubmit: page.getByRole("button", { name: "Добавить слот" }),
  slotsCard: page.locator('[data-slot-status="free"]'),
});

type TestUser = {
  name: string;
  email: string;
  password: string;
};

function makeUser(): TestUser {
  const runId = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

  return {
    name: `user-${runId}`,
    email: `user-${runId}@example.com`,
    password: "testpass123",
  };
}

async function registerUser(page: Page, user: TestUser) {
  const elements = locators(page);

  await page.goto(routes.register);
  await elements.registerNameInput.fill(user.name);
  await elements.registerEmailInput.fill(user.email);
  await elements.registerPasswordInput.fill(user.password);
  await elements.registerSubmit.click();
  await expect(page).toHaveURL(/\/pomidorqa\/?$/);
}

test.describe("Данные профиля после регистрации", () => {
  let user: TestUser;

  test.beforeEach(async ({ page }) => {
    user = makeUser();
    await registerUser(page, user);
    await page.goto(routes.profile);
  });

  test("смена имени в профиле", async ({ page }) => {
    const newName = `${user.name}-new`;
    const elements = locators(page);

    await elements.profileNameInput.fill(newName);
    await elements.profileNameSubmit.click();

    await expect(elements.profileNameInput).toHaveValue(newName);
  });

  test("добавление навыка", async ({ page }) => {
    const skill = `Playwright-${Date.now()}`;
    const elements = locators(page);

    await elements.profileSkillInput.fill(skill);
    await elements.profileSkillTypeSelect.selectOption("can_help");
    await elements.profileSkillSubmit.click();

    await expect(elements.profileCanHelpSkills).toContainText(skill);
  });

  test("добавление слота", async ({ page }) => {
    const tomorrow = new Date(Date.now() + 24 * 60 * 60 * 1000);
    const date = tomorrow.toISOString().slice(0, 10);
    const elements = locators(page);

    await page.goto(routes.slots);
    await elements.slotsDateInput.fill(date);
    await elements.slotsTimeInput.fill("12:00");
    await elements.slotsAddSubmit.click();

    await expect(elements.slotsCard.first()).toBeVisible();
  });
});
