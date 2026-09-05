import { test, expect, type Page } from "@playwright/test";

// Профиль после регистрации: три независимых теста.
// Регистрация здесь не объект проверки, а предусловие — поэтому она в beforeEach.
// Локаторы, makeUser и registerUser скопированы из booking-flow.spec.ts:
// его по условию ДЗ Урока 7 трогать нельзя, а общий модуль сделать без правки того файла не выйдет.

const ROUTES = {
  register: "/pomidorqa/auth/register",
  profile: "/pomidorqa/profile",
  slots: "/pomidorqa/profile/slots",
};

// ─────────────────────────────────────────────────────────────
// Локаторы: функция от страницы, чтобы не привязываться к одной вкладке
// ─────────────────────────────────────────────────────────────

// Регистрация
const nameInput = (page: Page) => page.getByLabel("Имя");
const emailInput = (page: Page) => page.getByLabel("Email");
const passwordInput = (page: Page) => page.getByLabel("Пароль");
const registerButton = (page: Page) => page.getByRole("button", { name: "Зарегистрироваться" });

// Профиль: карточка участника
const profileNameInput = (page: Page) => page.getByLabel("Имя");
const saveProfileButton = (page: Page) => page.getByRole("button", { name: "Сохранить" });

// Профиль: блок «Навыки»
const skillInput = (page: Page) => page.getByLabel("Навык");
const skillTypeSelect = (page: Page) => page.getByLabel("Тип");
const addSkillButton = (page: Page) => page.getByRole("button", { name: "Добавить" });
const canHelpSkills = (page: Page) => page.getByTestId("can-help-skills");

// Мои слоты
const slotDateInput = (page: Page) => page.getByLabel("Дата");
const slotTimeInput = (page: Page) => page.getByLabel("Время начала");
const addSlotButton = (page: Page) => page.getByRole("button", { name: "Добавить слот" });
const freeSlotCard = (page: Page) => page.locator('[data-slot-status="free"]').first();

// ─────────────────────────────────────────────────────────────
// Фабрики тестовых данных: никакого хардкода в подготовке
// ─────────────────────────────────────────────────────────────

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

// Дата в формате YYYY-MM-DD через указанное число дней от сегодня.
// Считаем каждый раз, чтобы слот не протух и тест не начал падать на ровном месте.
function dateInDays(days: number): string {
  return new Date(Date.now() + days * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
}

async function registerUser(page: Page, user: TestUser) {
  await page.goto(ROUTES.register);
  await nameInput(page).fill(user.name);
  await emailInput(page).fill(user.email);
  await passwordInput(page).fill(user.password);
  await registerButton(page).click();
  await expect(page).toHaveURL(/\/pomidorqa\/?$/);
}

// ─────────────────────────────────────────────────────────────

test.describe("Профиль после регистрации", () => {
  // Свой мир под каждый тест: новый пользователь, своя вкладка, чистый профиль.
  // Именно beforeEach, а не beforeAll — иначе все три теста делили бы один аккаунт
  // и начали бы мешать друг другу.
  test.beforeEach(async ({ page }) => {
    const user = makeUser("hw7", Date.now());
    await registerUser(page, user);
    await page.goto(ROUTES.profile);
  });

  test("смена имени в профиле сохраняется", async ({ page }) => {
    const newName = `Тимур Обновлённый ${Date.now()}`;

    await test.step("Меняем имя и дожидаемся ответа сервера", async () => {
      await profileNameInput(page).fill(newName);

      // Сохранение уходит POST-ом на адрес самой страницы, а признака успеха
      // в интерфейсе нет — ни надписи, ни смены состояния кнопки. Поэтому ждём
      // ответ сервера. Промис создаём до клика: иначе ответ может прийти раньше,
      // чем мы начнём его слушать, и ожидание повиснет.
      const saved = page.waitForResponse(
        (response) =>
          response.url().endsWith(ROUTES.profile) && response.request().method() === "POST"
      );
      await saveProfileButton(page).click();
      await saved;
    });

    await test.step("После перезагрузки имя пришло с сервера", async () => {
      // Перезагрузка выбрасывает состояние страницы и заставляет её заново
      // запросить данные. Без неё проверка сошлась бы сама с собой:
      // в поле лежит то, что мы туда вписали, даже если сохранение не прошло.
      await page.reload();
      await expect(profileNameInput(page)).toHaveValue(newName);
    });
  });

  test("добавление навыка «могу помочь»", async ({ page }) => {
    const skillTag = `Playwright-demo-${Date.now()}`;

    await test.step("Добавляем навык", async () => {
      await skillInput(page).fill(skillTag);
      await skillTypeSelect(page).selectOption("can_help");
      await addSkillButton(page).click();
    });

    await test.step("Навык виден в блоке «могу помочь»", async () => {
      await expect(canHelpSkills(page)).toContainText(skillTag);
    });
  });

  test("добавление свободного слота", async ({ page }) => {
    await test.step("Заводим слот на завтра", async () => {
      await page.goto(ROUTES.slots);
      await slotDateInput(page).fill(dateInDays(1));
      await slotTimeInput(page).fill("12:00");
      await addSlotButton(page).click();
    });

    await test.step("Слот появился со статусом «свободен»", async () => {
      await expect(freeSlotCard(page)).toBeVisible();
    });
  });
});
