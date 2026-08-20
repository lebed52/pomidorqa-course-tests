import { test, expect, type Page } from "@playwright/test";

const ROUTES = {
  register: "/pomidorqa/auth/register",
  profile: "/pomidorqa/profile",
  slots: "/pomidorqa/profile/slots",
};

// Форма регистрации
const registerNameInput = (page: Page) => page.getByLabel("Имя");
const registerEmailInput = (page: Page) => page.getByLabel("Email");
const registerPasswordInput = (page: Page) => page.getByLabel("Пароль");
const registerSubmitButton = (page: Page) => page.getByRole("button", { name: "Зарегистрироваться" });

// Профиль: карточка участника
const profileNameInput = (page: Page) => page.getByLabel("Имя");
const profileSaveButton = (page: Page) => page.getByRole("button", { name: "Сохранить" });

// Профиль: блок «Навыки»
const profileSkillInput = (page: Page) => page.getByLabel("Навык");
const profileSkillTypeSelect = (page: Page) => page.getByLabel("Тип");
const profileAddSkillButton = (page: Page) => page.getByRole("button", { name: "Добавить" });
const profileCanHelpSkills = (page: Page) => page.getByTestId("can-help-skills");

// Мои слоты
const slotsDateInput = (page: Page) => page.getByLabel("Дата");
const slotsTimeInput = (page: Page) => page.getByLabel("Время начала");
const slotsAddButton = (page: Page) => page.getByRole("button", { name: "Добавить слот" });
const slotsFreeCard = (page: Page) => page.locator('[data-slot-status="free"]').first();

type TestUser = {
  name: string;
  email: string;
  password: string;
};

function makeUser(role: string, runId: number): TestUser {
  return {
    name: `${role} Автотест ${runId}`,
    email: `${role}-${runId}@example.com`,
    password: "testpass123",
  };
}

function dateInDays(days: number): string {
  return new Date(Date.now() + days * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
}

async function registerUser(page: Page, user: TestUser) {
  await page.goto(ROUTES.register);
  await registerNameInput(page).fill(user.name);
  await registerEmailInput(page).fill(user.email);
  await registerPasswordInput(page).fill(user.password);
  await registerSubmitButton(page).click();
  await expect(page).toHaveURL(/\/pomidorqa\/?$/);
}

test.describe("Профиль после регистрации", () => {
  test.beforeEach(async ({ page }) => {
    const user = makeUser("hw7", Date.now());
    await registerUser(page, user);
    await page.goto(ROUTES.profile);
  });

  test("смена имени в профиле сохраняется", async ({ page }) => {
    const newName = `Тестовое Имя ${Date.now()}`;

    await test.step("Меняем имя и дожидаемся ответа сервера", async () => {
      await profileNameInput(page).fill(newName);
      const saved = page.waitForResponse(
        (response) =>
          response.url().endsWith(ROUTES.profile) && response.request().method() === "POST"
      );
      await profileSaveButton(page).click();
      await saved;
    });

    await test.step("После перезагрузки имя пришло с сервера", async () => {
      await page.reload();
      await expect(profileNameInput(page)).toHaveValue(newName);
    });
  });

  test("добавление навыка «могу помочь»", async ({ page }) => {
    const skillTag = `Playwright-demo-${Date.now()}`;

    await test.step("Добавляем навык", async () => {
      await profileSkillInput(page).fill(skillTag);
      await profileSkillTypeSelect(page).selectOption("can_help");
      await profileAddSkillButton(page).click();
    });

    await test.step("Навык виден в блоке «могу помочь»", async () => {
      await expect(profileCanHelpSkills(page)).toContainText(skillTag);
    });
  });

  test("добавление свободного слота", async ({ page }) => {
    await test.step("Заводим слот на завтра", async () => {
      await page.goto(ROUTES.slots);
      await slotsDateInput(page).fill(dateInDays(1));
      await slotsTimeInput(page).fill("12:00");
      await slotsAddButton(page).click();
    });

    await test.step("Слот появился со статусом «свободен»", async () => {
      await expect(slotsFreeCard(page)).toBeVisible();
    });
  });
});