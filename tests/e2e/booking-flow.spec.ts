import { test, expect, type Page } from "@playwright/test";

// E2E-уровень пирамиды: реальный браузер на живом стенде aiqa.su/pomidorqa.
// После ДЗ Урока 4: guest2 открывает тот же слот и должен увидеть ошибку.
// После ДЗ Урока 5: host/guest/guest2 регистрируются через registerUser.
// После ДЗ Урока 6: локаторы вынесены наверх, старых Pomidorqa*-testid на стенде больше нет.
//POMIDORQA_BASE_URL=http://localhost:3000 npx playwright test --project=e2e tests/e2e/booking-flow.spec.ts

// ─────────────────────────────────────────────────────────────
// Локаторы. Каждый — функция от страницы, потому что вкладок три
// (хост, гость, гость2) и один и тот же элемент ищется в разных.
// ─────────────────────────────────────────────────────────────

// Регистрация
const nameInput = (page: Page) => page.getByLabel("Имя");
const emailInput = (page: Page) => page.getByLabel("Email");
const passwordInput = (page: Page) => page.getByLabel("Пароль");
const registerButton = (page: Page) => page.getByRole("button", { name: "Зарегистрироваться" });

// Профиль: блок «Навыки»
const skillInput = (page: Page) => page.getByPlaceholder(/Playwright/);
const skillTypeSelect = (page: Page) => page.getByLabel("Тип");
const addSkillButton = (page: Page) => page.getByRole("button", { name: "Добавить" });
const canHelpSkills = (page: Page) => page.getByTestId("can-help-skills");

// Мои слоты
const slotDateInput = (page: Page) => page.getByLabel("Дата");
const slotTimeInput = (page: Page) => page.getByLabel("Время начала");
const addSlotButton = (page: Page) => page.getByRole("button", { name: "Добавить слот" });
const freeSlotCard = (page: Page) => page.locator('[data-slot-status="free"]').first();

// Каталог участников
const catalogSkillFilter = (page: Page) => page.locator("#pomidorqa-catalog-skill-filter");
const catalogSearchButton = (page: Page) => page.locator("//button[normalize-space()='Найти']");
const personCard = (page: Page, name: string) =>
  page.getByTestId("person-card").filter({ hasText: name });

// Карточка участника и календарь его слотов
const personHeading = (page: Page) => page.getByRole("heading", { level: 1 });
const calendarDay = (page: Page) => page.locator("[data-date]").first();
const calendarTime = (page: Page) => page.locator("[data-slot-id]").first();

// Окно подтверждения бронирования
const bookingModalTitle = (page: Page) => page.getByText("Подтвердить бронирование?");
const confirmButton = (page: Page) => page.getByRole("button", { name: "Подтвердить" });
const closeButton = (page: Page) => page.getByRole("button", { name: "Закрыть" });
const bookedMessage = (page: Page) => page.getByText("Забронировано");
const slotTakenMessage = (page: Page) => page.getByText("Этот слот только что забронировали");

// Мои встречи
const upcomingMeetings = (page: Page) => page.getByTestId("upcoming-meetings");

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
  await nameInput(page).fill(user.name);
  await emailInput(page).fill(user.email);
  await passwordInput(page).fill(user.password);
  await registerButton(page).click();
  await expect(page).toHaveURL(/\/pomidorqa\/?$/);
}

test("основной путь + гонка за слот: регистрация → навык → слот → поиск в каталоге → бронирование → «Мои встречи» у обоих → второй гость видит ошибку", async ({
  browser,
}) => {
  const runId = Date.now();
  const skillTag = `Playwright-demo-${runId}`;
  const host = makeUser("host", runId);
  const guest = makeUser("guest", runId);
  const guest2 = makeUser("guest2", runId);

  // Три независимых аккаунта = три независимых браузерных контекста
  const hostContext = await browser.newContext();
  const guestContext = await browser.newContext();
  const guest2Context = await browser.newContext();
  const hostPage = await hostContext.newPage();
  const guestPage = await guestContext.newPage();
  const guest2Page = await guest2Context.newPage();

  await test.step("Хост: регистрируется в PomidorQA", async () => {
    await registerUser(hostPage, host);
  });

  await test.step("Хост: добавляет навык «могу помочь» в профиле", async () => {
    await hostPage.goto("/pomidorqa/profile");
    await skillInput(hostPage).fill(skillTag);
    await skillTypeSelect(hostPage).selectOption("can_help");
    await addSkillButton(hostPage).click();
    await expect(canHelpSkills(hostPage)).toContainText(skillTag);
  });

  await test.step("Хост: добавляет свободный слот на завтра", async () => {
    await hostPage.goto("/pomidorqa/profile/slots");
    const tomorrow = new Date(Date.now() + 24 * 60 * 60 * 1000);
    const date = tomorrow.toISOString().slice(0, 10);
    await slotDateInput(hostPage).fill(date);
    await slotTimeInput(hostPage).fill("12:00");
    await addSlotButton(hostPage).click();
    await expect(freeSlotCard(hostPage)).toBeVisible();
  });

  await test.step("Гость: регистрируется отдельным аккаунтом", async () => {
    await registerUser(guestPage, guest);
  });

  await test.step("Гость: ищет хоста в каталоге по навыку (сценарий 9)", async () => {
    await catalogSkillFilter(guestPage).fill(skillTag);
    await catalogSearchButton(guestPage).click();
    await expect(personCard(guestPage, host.name)).toBeVisible();
  });

  await test.step("Гость: открывает карточку хоста", async () => {
    await personCard(guestPage, host.name).click();
    await expect(personHeading(guestPage)).toHaveText(host.name);
  });

  await test.step("Гость: кликает по дню и времени в календаре слотов", async () => {
    await expect(async () => {
      if (!(await calendarDay(guestPage).isVisible().catch(() => false))) {
        await guestPage.reload();
      }
      await expect(calendarDay(guestPage)).toBeVisible();
    }).toPass({ timeout: 10_000 });

    await calendarDay(guestPage).click();

    // Календарь перерисовывается после выбора дня: кнопка времени уже видна,
    // но обработчик на ней может быть ещё не навешен, и клик уходит впустую.
    await expect(async () => {
      await calendarTime(guestPage).click();
      await expect(bookingModalTitle(guestPage)).toBeVisible({ timeout: 3000 });
    }).toPass({ timeout: 20_000 });
  });

  // Важно для разбора ДЗ 4: модалку guest2 открываем ДО confirm у guest.
  // Пока слот в UI ещё свободен — оба «человек открыл и отошёл».
  await test.step("Гость2: регистрируется и тоже открывает окно бронирования на тот же слот", async () => {
    await registerUser(guest2Page, guest2);

    await catalogSkillFilter(guest2Page).fill(skillTag);
    await catalogSearchButton(guest2Page).click();
    await personCard(guest2Page, host.name).click();
    await expect(personHeading(guest2Page)).toHaveText(host.name);

    await expect(async () => {
      if (!(await calendarDay(guest2Page).isVisible().catch(() => false))) {
        await guest2Page.reload();
      }
      await expect(calendarDay(guest2Page)).toBeVisible();
    }).toPass({ timeout: 10_000 });

    await calendarDay(guest2Page).click();

    await expect(async () => {
      await calendarTime(guest2Page).click();
      await expect(bookingModalTitle(guest2Page)).toBeVisible({ timeout: 3000 });
    }).toPass({ timeout: 20_000 });
  });

  await test.step("Гость: подтверждает бронирование первым — успех", async () => {
    await confirmButton(guestPage).click();
    // Кнопка «Закрыть» появляется в любом исходе — значит сервер ответил.
    await expect(closeButton(guestPage)).toBeVisible({ timeout: 15_000 });
    await expect(bookedMessage(guestPage)).toBeVisible();
  });

  await test.step("Гость2: пытается забронировать тот же слот вторым — видит ошибку", async () => {
    await confirmButton(guest2Page).click();

    // Полярность наоборот относительно гостя 1: ошибка — ожидаемый результат
    await expect(slotTakenMessage(guest2Page)).toBeVisible({ timeout: 15_000 });
    await expect(bookedMessage(guest2Page)).toBeHidden();
  });

  await test.step("Гость: видит бронирование в разделе «Мои встречи»", async () => {
    await expect(async () => {
      await guestPage.goto("/pomidorqa/bookings");
      await expect(upcomingMeetings(guestPage)).toContainText(host.name);
    }).toPass({ timeout: 10_000 });
  });

  await test.step("Хост: тоже видит это бронирование в своих «Мои встречи»", async () => {
    await expect(async () => {
      await hostPage.goto("/pomidorqa/bookings");
      await expect(upcomingMeetings(hostPage)).toContainText(guest.name);
    }).toPass({ timeout: 10_000 });
  });

  await hostContext.close();
  await guestContext.close();
  await guest2Context.close();
});
