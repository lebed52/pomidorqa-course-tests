import { test, expect, type Page } from "@playwright/test";

// ДЗ Урока 7: данные, которые пользователь получает после регистрации.
// Регистрация — предусловие (Arrange), не объект проверки, поэтому она в beforeEach.
// Каркас: типы → фабрика → хелпер → describe → хук Arrange → короткие тесты.

const PAGES = {
  register: "/pomidorqa/auth/register",
  profile: "/pomidorqa/profile",
  slots: "/pomidorqa/profile/slots",
} as const;

// ── Локаторы: функция от страницы, чтобы не привязываться к одной вкладке ──

// Регистрация
const regName = (page: Page) => page.getByLabel("Имя");
const regEmail = (page: Page) => page.getByLabel("Email");
const regPassword = (page: Page) => page.getByLabel("Пароль");
const regSubmit = (page: Page) =>
  page.getByRole("button", { name: "Зарегистрироваться" });

// Профиль: карточка участника
const profileName = (page: Page) => page.getByLabel("Имя");
const saveProfile = (page: Page) => page.getByRole("button", { name: "Сохранить" });

// Профиль: блок «Навыки»
const skillInput = (page: Page) => page.getByLabel("Навык");
const skillType = (page: Page) => page.getByLabel("Тип");
const addSkill = (page: Page) => page.getByRole("button", { name: "Добавить" });
const canHelpSkills = (page: Page) => page.getByTestId("can-help-skills");

// Мои слоты
const slotDate = (page: Page) => page.getByLabel("Дата");
const slotTime = (page: Page) => page.getByLabel("Время начала");
const addSlot = (page: Page) => page.getByRole("button", { name: "Добавить слот" });
const freeSlotCard = (page: Page) => page.locator('[data-slot-status="free"]').filter({ hasText: "10:00" });

// ── Фабрика тестовых данных ──

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

// ── Хелпер подготовки: только шаги регистрации, без проверяемых действий ──

async function registerUser(page: Page, user: TestUser) {
  await page.goto(PAGES.register);
  await regName(page).fill(user.name);
  await regEmail(page).fill(user.email);
  await regPassword(page).fill(user.password);
  await regSubmit(page).click();
  await expect(page).toHaveURL(/\/pomidorqa\/?$/);
}

// Дата в формате YYYY-MM-DD через указанное число дней от сегодня.
// Считаем каждый раз, чтобы слот не протух и тест не начал падать на ровном месте.
function dateInDays(days: number): string {
  return new Date(Date.now() + days * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
}

// ── Тесты ──

test.describe("данные после регистрации", () => {
  let user: TestUser;

  test.beforeEach(async ({ page }) => {
    // Arrange: свой мир на каждый тест — новый пользователь и чистый профиль.
    user = makeUser("hw7", Date.now());
    await registerUser(page, user);
    await page.goto(PAGES.profile);
  });

  test("имя в профиле можно изменить и оно сохраняется", async ({ page }) => {
    const newName = `Имя Обновлено ${Date.now()}`;

    await test.step("В поле пока лежит имя с регистрации", async () => {
      await expect(profileName(page)).toHaveValue(user.name);
    });

    await test.step("Меняем имя и дожидаемся сохранения", async () => {
      await profileName(page).fill(newName);

      // Признака успеха в UI нет: сохранение уходит POST-ом на адрес профиля.
      // Промис вешаем до клика — иначе ответ придёт раньше, чем начнём слушать.
      const saved = page.waitForResponse(
        (r) => r.url().endsWith(PAGES.profile) && r.request().method() === "POST"
      );
      await saveProfile(page).click();
      await saved;
    });

    await test.step("После перезагрузки имя пришло с сервера", async () => {
      // Reload выбрасывает состояние страницы: имя теперь должно прийти с сервера,
      // а не просто лежать в поле, куда мы его вписали.
      await page.reload();
      await expect(profileName(page)).toHaveValue(newName);
    });
  });

  test("навык «могу помочь» появляется в профиле", async ({ page }) => {
    const skill = `Playwright-hw7-${Date.now()}`;

    await test.step("Добавляем навык с типом «могу помочь»", async () => {
      await skillInput(page).fill(skill);
      await skillType(page).selectOption("can_help");
      await addSkill(page).click();
    });

    await test.step("Навык виден в списке «могу помочь»", async () => {
      await expect(canHelpSkills(page)).toContainText(skill);
    });
  });

  test("слот на завтра создаётся свободным", async ({ page }) => {
    const date = dateInDays(1);

    await test.step("Заводим слот на завтра", async () => {
      // Страница слотов — часть Arrange этого теста: beforeEach ведёт в профиль.
      await page.goto(PAGES.slots);
      await slotDate(page).fill(date);
      await slotTime(page).fill("10:00");
      await addSlot(page).click();
    });

    await test.step("Наш слот появился со статусом «свободен»", async () => {
      // Ищем именно наш слот — по времени, а не «любой первый свободный».
      await expect(freeSlotCard(page)).toBeVisible();
    });
  });
});
