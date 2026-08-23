import { test, expect, type Page } from "@playwright/test";

// --- Карта локаторов ----
const registerNameInput = (page: Page) => page.getByLabel("Имя");
const registerEmailInput = (page: Page) => page.getByLabel("Email");
const registerPasswordInput = (page: Page) => page.getByLabel("Пароль");
const registerSubmitButton = (page: Page) => page.getByRole("button", { name: "Зарегистрироваться" });

const profileName = (page: Page) => page.getByLabel("Имя" );
const saveProfile = (page: Page) => page.getByRole("button", { name: "Сохранить" });

const skillInput = (page: Page) => page.getByLabel("Навык");
const skillType = (page: Page) => page.getByLabel("Тип");
const addSkillButton = (page: Page) => page.getByRole("button", { name: "Добавить" });
const canHelpSkills = (page: Page) => page.getByTestId("can-help-skills");

const skillTag = "Навык";

/*
const slotsDateInput = (page: Page) => page.getByLabel("Дата");
const slotsTimeInput = (page: Page) => page.getByLabel("Время начала");
const addSlotButton = (page: Page) => page.getByRole("button", { name: "Добавить" });
const freeSlotChip = (page: Page) => page.locator("[data-slot-status=free]");

const upcomingPartners = (page: Page) => page.getByTestId("upcoming-meetings").locator("p.font-medium");

const catalogFilterInput = (page: Page) => page.locator("#pomidorqa-catalog-skill-filter");
const catalogFilterSubmit = (page: Page) => page.getByRole("button", { name: "Найти" });
const catalogCard = (page: Page) => page.getByTestId("person-card");
*/

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
    await registerNameInput(page).fill(user.name)
    await registerEmailInput(page).fill(user.email);
    await registerPasswordInput(page).fill(user.password);
    await registerSubmitButton(page).click();
    await expect(page).toHaveURL(/\/pomidorqa\/?$/);
}

test.describe("Тесты на профиле после регистрации", () => {
  let user: TestUser;

  test.beforeEach(async ({ page }) => {
    user = makeUser("student", Date.now());
    await registerUser(page, user);
    await page.goto("/pomidorqa/profile");
  });

  test.afterEach(async ({ page }) => {
    await page.close();
  });

  test("Смена имени пользователя в профиле", async ({ page }) => {
    const newName = `$(user.name) New`;

    await test.step("Вводим новое имя и сохраняем изменения", async () => {
      await profileName(page).fill(newName);
      await saveProfile(page).click();
      await expect(profileName(page)).toHaveValue(newName);
    });
  });

  test("Добавление навыка в профиле", async ({ page }) => {
    await test.step("Добавляем навык Навык и сохраняем изменения", async () => {
      await skillInput(page).fill(skillTag);
      await skillType(page).selectOption("can_help")
      await addSkillButton(page).click();
      await expect(canHelpSkills(page)).toContainText(skillTag);
    });
  });
});