import { test, expect, type Page } from "@playwright/test";

/**
 * @file booking-flow.spec.ts
 * @description E2E: основной сценарий бронирования + гонка за слот (race condition).
 *
 * Архитектура:
 * ---------------------------------------------------------------------------
 * • Локаторы вынесены в реестр `locators` — единая точка правды для селекторов,
 *   каждый — `(page: Page) => Locator` с ленивой инициализацией. Шаги теста
 *   работают только с `locators.*`, без inline-селекторов.
 * • Три независимых browser context (Хост / Гость 1 / Гость 2) — честная
 *   симуляция гонки за слот, а не последовательные вызовы в одном контексте.
 * • Автоповторяющиеся ассерты (`toPass`) и `page.reload()` там, где состояние
 *   интерфейса может ещё не подтянуться (список слотов, календарь).
 */

const locators = {
  // --- Авторизация ---
  nameInput: (page: Page) => page.getByLabel("Имя"),
  emailInput: (page: Page) => page.getByLabel("Email"),
  passwordInput: (page: Page) => page.getByLabel("Пароль"),
  registerSubmit: (page: Page) =>
    page.getByRole("button", { name: "Зарегистрироваться" }),

  // --- Профиль: навыки ---
  skillInput: (page: Page) => page.getByLabel("Навык"),
  skillTypeSelect: (page: Page) => page.locator("#pomidorqa-profile-skill-type"),
  addSkillSubmit: (page: Page) => page.getByRole("button", { name: /добавить/i }),
  canHelpArea: (page: Page) => page.getByTestId("can-help-skills"),
  skillChip: (page: Page, tag: string) => page.locator(`[data-skill-tag="${tag}"]`),

  // --- Профиль: слоты ---
  slotDateInput: (page: Page) => page.getByLabel("Дата"),
  slotTimeInput: (page: Page) => page.getByLabel("Время начала"),
  addSlotSubmit: (page: Page) => page.getByRole("button", { name: /добавить/i }),
  hostSlotCard: (page: Page) => page.locator('[data-slot-status="free"]').first(),

  // --- Каталог ---
  filterInput: (page: Page) => page.locator("#pomidorqa-catalog-skill-filter"),
  filterSubmit: (page: Page) =>
    page.locator("xpath=//button[normalize-space()='Найти']"),
  personCard: (page: Page, hostName: string) =>
    page.getByTestId("person-card").filter({ hasText: hostName }),

  // --- Профиль хоста / календарь ---
  personHeading: (page: Page, name: string) => page.getByRole("heading", { name }),
  freeDayChip: (page: Page) =>
    page.getByText(/^[а-яё]{2}, \d{1,2} [а-яё]{3,8}\.?$/iu).first(),
  guestTimeChip: (page: Page) =>
    page.getByRole("button", { name: /^\d{1,2}:\d{2}$/ }).first(),

  // --- Модалка подтверждения ---
  dialog: (page: Page) => page.getByRole("dialog"),
  confirmBtn: (page: Page) =>
    page.getByRole("dialog").getByRole("button", { name: /подтверд/i }),
  successMsg: (page: Page) =>
    page.getByRole("dialog").getByText(/забронировано|успешно забронирован/i),
  errorMsg: (page: Page) =>
    page.getByRole("dialog").getByText(/выбери|уже занят|уже забронирован/i),

  // --- Мои встречи ---
  upcomingMeetingsArea: (page: Page) => page.getByTestId("upcoming-meetings"),
};

// =====================================================================
// ВСПОМОГАТЕЛЬНЫЕ ФУНКЦИИ И ТИПЫ
// =====================================================================

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
  await locators.nameInput(page).fill(user.name);
  await locators.emailInput(page).fill(user.email);
  await locators.passwordInput(page).fill(user.password);
  await locators.registerSubmit(page).click();
  await expect(page).toHaveURL(/\/pomidorqa\/?$/);
}

async function openHostSlotAndConfirmModal(page: Page, skillTag: string, hostName: string) {
  await locators.filterInput(page).fill(skillTag);
  await locators.filterSubmit(page).click();
  await expect(locators.personCard(page, hostName)).toBeVisible();

  await locators.personCard(page, hostName).click();
  await expect(locators.personHeading(page, hostName)).toBeVisible();

  await expect(async () => {
    const dayChip = locators.freeDayChip(page);
    if (!(await dayChip.isVisible().catch(() => false))) {
      await page.reload();
    }
      await expect(dayChip).toBeVisible();
  }).toPass({ timeout: 10_000 });

  await locators.freeDayChip(page).click();
  await locators.guestTimeChip(page).click();
  await expect(locators.dialog(page)).toBeVisible();
}

// =====================================================================
// ТЕСТ
// =====================================================================

test("основной путь + гонка за слот: регистрация → навык → слот → поиск в каталоге → бронирование → «Мои встречи» у обоих → второй гость видит ошибку", async ({
  browser,
}) => {
  const runId = Date.now();
  const skillTag = `Playwright-demo-${runId}`;
  const host = makeUser("host", runId);
  const guest = makeUser("guest", runId);
  const guest2 = makeUser("guest2", runId);

  const hostContext = await browser.newContext();
  const guestContext = await browser.newContext();
  const guest2Context = await browser.newContext();
  const hostPage = await hostContext.newPage();
  const guestPage = await guestContext.newPage();
  const guest2Page = await guest2Context.newPage();

  await test.step("Хост: регистрируется в PomidorQA", async () => {
    await registerUser(hostPage, host);
  });

  await test.step('Хост: добавляет навык «могу помочь» в профиле', async () => {
    await hostPage.goto("/pomidorqa/profile");
    await locators.skillInput(hostPage).fill(skillTag);
    await locators.skillTypeSelect(hostPage).selectOption("can_help");
    await locators.addSkillSubmit(hostPage).click();

    await expect(locators.canHelpArea(hostPage)).toBeVisible();
    await expect(locators.skillChip(hostPage, skillTag)).toBeVisible();
  });

  await test.step("Хост: добавляет свободный слот на завтра", async () => {
    await hostPage.goto("/pomidorqa/profile/slots");
    const tomorrow = new Date(Date.now() + 24 * 60 * 60 * 1000);
    const date = tomorrow.toISOString().slice(0, 10);

    await locators.slotDateInput(hostPage).fill(date);
    await locators.slotTimeInput(hostPage).fill("12:00");
    await locators.addSlotSubmit(hostPage).click();

    await expect(locators.hostSlotCard(hostPage)).toBeVisible();
  });

  await test.step("Гость: регистрируется отдельным аккаунтом", async () => {
    await registerUser(guestPage, guest);
  });

  await test.step("Гость: ищет хоста в каталоге, открывает карточку и слот", async () => {
    await openHostSlotAndConfirmModal(guestPage, skillTag, host.name);
  });

  await test.step("Гость2: регистрируется и тоже открывает окно бронирования на тот же слот", async () => {
    await registerUser(guest2Page, guest2);
    await openHostSlotAndConfirmModal(guest2Page, skillTag, host.name);
  });

  await test.step("Гость: подтверждает бронирование первым — успех", async () => {
    await locators.confirmBtn(guestPage).click();
    const success = locators.successMsg(guestPage);
    const error = locators.errorMsg(guestPage);

    await expect(success.or(error)).toBeVisible({ timeout: 15_000 });
    if (await error.isVisible().catch(() => false)) {
      throw new Error(`Бронирование не удалось: ${await error.textContent()}`);
    }
  });

  await test.step("Гость2: пытается забронировать тот же слот вторым — видит ошибку", async () => {
    await locators.confirmBtn(guest2Page).click();

    const success2 = locators.successMsg(guest2Page);
    const error2 = locators.errorMsg(guest2Page);

    await expect(success2.or(error2)).toBeVisible({ timeout: 15_000 });
    if (await success2.isVisible().catch(() => false)) {
      throw new Error("Слот должен был быть занят, но бронирование прошло успешно");
    }
    await expect(error2).toBeVisible();
  });

  await test.step("Гость: видит бронирование в разделе «Мои встречи»", async () => {
    await expect(async () => {
      await guestPage.goto("/pomidorqa/bookings");
      await expect(locators.upcomingMeetingsArea(guestPage)).toContainText(host.name);
    }).toPass({ timeout: 10_000 });
  });

  await test.step("Хост: тоже видит это бронирование в своих «Мои встречи»", async () => {
    await expect(async () => {
      await hostPage.goto("/pomidorqa/bookings");
      await expect(locators.upcomingMeetingsArea(hostPage)).toContainText(guest.name);
    }).toPass({ timeout: 10_000 });
  });

  await hostContext.close();
  await guestContext.close();
  await guest2Context.close();
});