import { test, expect, type Page } from "@playwright/test";

// E2E-уровень пирамиды: реальный браузер на живом стенде aiqa.su/pomidorqa.
// После ДЗ Урока 4: guest2 открывает тот же слот и должен увидеть ошибку.
// host/guest уже через registerUser; регистрация guest2 пока инлайн — это заготовка к ДЗ Урока 5.
//POMIDORQA_BASE_URL=http://localhost:3000 npx playwright test --project=e2e tests/e2e/booking-flow.spec.ts

// Форма регистрации - локаторы полей
const registerNameInput = (page: Page) => page.getByLabel("Имя");
const registerEmailInput = (page: Page) => page.getByLabel("Email");
const registerPasswordInput = (page: Page) => page.getByLabel("Пароль");

// Профиль локаторы
const profileAddSkillInput = (page: Page) => page.locator("#pomidorqa-profile-skill-input");
const profileAddSkillTypeSelect = (page: Page) => page.locator("#pomidorqa-profile-skill-type");
const profileCanHelpSkills = (page: Page) => page.getByTestId("can-help-skills");

// Слоты локаторы
const slotsDateInput = (page: Page) => page.locator("#pomidorqa-slots-date");
const slotsTimeInput = (page: Page) => page.locator("#pomidorqa-slots-time");
const slotsCard = (page: Page) => page.locator("[data-slot-id]");

// Каталог локаторы
const catalogFilterInput = (page: Page) => page.locator("#pomidorqa-catalog-skill-filter");
const catalogCard = (page: Page) => page.getByTestId("person-card");
const findButton = (page: Page) => page.locator("xpath=//button[normalize-space(.)='Найти']");

// Имя хоста на тсранице профиля
const personName = (page: Page) => page.locator("main").getByRole("heading", { level: 1 });

// Бронирование - календарь и попап подтверждения
const bookingCalendarDay = (page: Page) => page.locator("[data-date]");
const bookingCalendarTime = (page: Page) => page.locator("[data-slot-id]");
const bookingConfirmModelSuccess = (page: Page) => page.locator("[role='status']:has-text('Забронировано!')");
const bookingConfirmModelError = (page: Page) => page.locator("[role='dialog'] [role='alert']");
const bookingConfirmDialog = (page: Page) => page.getByRole("dialog");

// Мои встречи
const bookingsUpcomingSection = (page: Page) => page.getByTestId("upcoming-meetings");

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

async function clickButtonByName(page: Page, name: string) {
  await page.getByRole("button", { name, exact: true }).click();
}

async function registerUser(page: Page, user: TestUser) {
  await page.goto("/pomidorqa/auth/register");
  await registerNameInput(page).fill(user.name);
  await registerEmailInput(page).fill(user.email);
  await registerPasswordInput(page).fill(user.password);
  await clickButtonByName(page, "Зарегистрироваться");
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

  await test.step('Хост: добавляет навык «могу помочь» в профиле', async () => {
    await hostPage.goto("/pomidorqa/profile");
    await profileAddSkillInput(hostPage).fill(skillTag);
    await profileAddSkillTypeSelect(hostPage).selectOption("can_help");
    await clickButtonByName(hostPage, "Добавить");
    await expect(profileCanHelpSkills(hostPage).first()).toContainText(skillTag);
  });

  await test.step("Хост: добавляет свободный слот на завтра", async () => {
    await hostPage.goto("/pomidorqa/profile/slots");
    const tomorrow = new Date(Date.now() + 24 * 60 * 60 * 1000);
    const date = tomorrow.toISOString().slice(0, 10);
    await slotsDateInput(hostPage).fill(date);
    await slotsTimeInput(hostPage).fill("12:00");
    await clickButtonByName(hostPage, "Добавить слот");
    await expect(slotsCard(hostPage).first()).toBeVisible();
  });

  await test.step("Гость: регистрируется отдельным аккаунтом", async () => {
    await registerUser(guestPage, guest);
  });

  await test.step("Гость: ищет хоста в каталоге по навыку (сценарий 9)", async () => {
    await catalogFilterInput(guestPage).fill(skillTag);
    await findButton(guestPage).click();
    await expect(
      catalogCard(guestPage).filter({ hasText: host.name })
    ).toBeVisible();
  });

  await test.step("Гость: открывает карточку хоста", async () => {
    await catalogCard(guestPage).filter({ hasText: host.name }).click();
    await expect(personName(guestPage)).toHaveText(host.name);
  });

  await test.step("Гость: кликает по дню и времени в календаре слотов", async () => {
    await expect(async () => {
      const dayChip = bookingCalendarDay(guestPage).first();
      if (!(await dayChip.isVisible().catch(() => false))) {
        await guestPage.reload();
      }
      await expect(dayChip).toBeVisible();
    }).toPass({ timeout: 10_000 });

    await bookingCalendarDay(guestPage).first().click();
    await bookingCalendarTime(guestPage).first().click();
    await expect(bookingConfirmDialog(guestPage)).toBeVisible();
  });

  // Важно для разбора ДЗ 4: модалку guest2 открываем ДО confirm у guest.
  // Пока слот в UI ещё свободен — оба «человек открыл и отошёл».
  await test.step("Гость2: регистрируется и тоже открывает окно бронирования на тот же слот", async () => {
    await guest2Page.goto("/pomidorqa/auth/register");
    await registerNameInput(guest2Page).fill(guest2.name);
    await registerEmailInput(guest2Page).fill(guest2.email);
    await registerPasswordInput(guest2Page).fill(guest2.password);
    await clickButtonByName(guest2Page, "Зарегистрироваться");
    await expect(guest2Page).toHaveURL(/\/pomidorqa\/?$/);

    await catalogFilterInput(guest2Page).fill(skillTag);
    await findButton(guest2Page).click();
    await catalogCard(guest2Page).filter({ hasText: host.name }).click();
    await expect(personName(guest2Page)).toHaveText(host.name);

    await expect(async () => {
      const dayChip = bookingCalendarDay(guest2Page).first();
      if (!(await dayChip.isVisible().catch(() => false))) {
        await guest2Page.reload();
      }
      await expect(dayChip).toBeVisible();
    }).toPass({ timeout: 10_000 });

    await bookingCalendarDay(guest2Page).first().click();
    await bookingCalendarTime(guest2Page).first().click();
    await expect(bookingConfirmDialog(guest2Page)).toBeVisible();
  });

  await test.step("Гость: подтверждает бронирование первым — успех", async () => {
    await clickButtonByName(guestPage, "Подтвердить");
    const success = bookingConfirmModelSuccess(guestPage);
    const error = bookingConfirmModelError(guestPage);
    await expect(success.or(error)).toBeVisible({ timeout: 15_000 });
    if (await error.isVisible().catch(() => false)) {
      throw new Error(`Бронирование не удалось: ${await error.textContent()}`);
    }
  });

  await test.step("Гость2: пытается забронировать тот же слот вторым — видит ошибку", async () => {
    await clickButtonByName(guest2Page, "Подтвердить");

    const success2 = bookingConfirmModelSuccess(guest2Page);
    const error2 = bookingConfirmModelError(guest2Page);
    await expect(success2.or(error2)).toBeVisible({ timeout: 15_000 });

    // Полярность наоборот относительно гостя 1: ошибка — ожидаемый результат
    if (await success2.isVisible().catch(() => false)) {
      throw new Error("Слот должен был быть занят, но бронирование прошло успешно");
    }
    await expect(error2).toBeVisible();
  });

  await test.step("Гость: видит бронирование в разделе «Мои встречи»", async () => {
    await expect(async () => {
      await guestPage.goto("/pomidorqa/bookings");
      await expect(bookingsUpcomingSection(guestPage).getByText(host.name)).toBeVisible()
    }).toPass({ timeout: 10_000 });
  });

  await test.step("Хост: тоже видит это бронирование в своих «Мои встречи»", async () => {
    await expect(async () => {
      await hostPage.goto("/pomidorqa/bookings");
      await expect(bookingsUpcomingSection(hostPage).getByText(guest.name)).toBeVisible()
    }).toPass({ timeout: 10_000 });
  });

  await hostContext.close();
  await guestContext.close();
  await guest2Context.close();
});
