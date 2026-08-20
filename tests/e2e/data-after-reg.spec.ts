import { test, expect, type Page } from "@playwright/test";

const registerNameInput = (page: Page) => page.getByRole("textbox", { name: "Имя" });
const registerEmailInput = (page: Page) => page.getByRole("textbox", { name: "Email" });
const registerPasswordInput = (page: Page) => page.getByLabel('Пароль');
const registerSubmitButton = (page: Page) => page.getByRole("button", { name: "Зарегистрироваться" });

const profileCanHelpSkillsList = (page: Page) => page.getByTestId("can-help-skills");
const profileNameInput = (page: Page) => page.getByLabel('Имя');
const profileSaveButton = (page: Page) => page.getByRole('button', { name: 'Сохранить' });
const profileSkillInput = (page: Page) => page.getByLabel("Навык");
const profileSkillTypeSelect = (page: Page) =>
  page.getByRole('combobox', { name: 'Тип' });
const profileAddSkillButton = (page: Page) =>
  page.getByRole('button', { name: 'Добавить' });

const slotsDateInput = (page: Page) => page.getByLabel("Дата");
const slotsTimeInput = (page: Page) => page.getByLabel("Время начала");
const slotsAddButton = (page: Page) => page.getByRole("button", { name: "Добавить слот" });
const slotCard = (page: Page) => page.locator("[data-slot-id]").first();


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
  await registerSubmitButton(page).click();
  await expect(page).toHaveURL(/\/pomidorqa\/?$/);
}

test.describe("Arrange practice", () => {
  let user: TestUser;
  
  test.beforeEach(async ({ page }) => {
    const runId = Date.now();
    user = makeUser("testuser", runId);
    await registerUser(page, user);
    await page.goto("/pomidorqa/profile");
  });

  test("смена имени в профиле", async ({ page }) => {
    const newName = `Новое имя ${Date.now()}`;
    await profileNameInput(page).fill(newName);
    await profileSaveButton(page).click();
    await expect(profileNameInput(page)).toHaveValue(newName);
  });
  
  test("Добавление навыка", async ({ page }) => {
    const skillTag = `Playwright-demo-${Date.now()}`;
    await profileSkillInput(page).fill(skillTag);
    await profileSkillTypeSelect(page).selectOption("can_help");
    await profileAddSkillButton(page).click();
    await expect(profileCanHelpSkillsList(page)).toContainText(skillTag);
    });

  test("Добавление слота", async ({page}) => {
    await page.goto("/pomidorqa/profile/slots");
    const tomorrow = new Date(Date.now() + 24 * 60 * 60 * 1000);
    const date = tomorrow.toISOString().slice(0, 10);
    await slotsDateInput(page).fill(date);
    await slotsTimeInput(page).fill("12:00");
    await slotsAddButton(page).click();
    await expect(slotCard(page)).toBeVisible();
    });
})