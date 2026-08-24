import { test, expect, type Page } from "@playwright/test";

// E2E-уровень пирамиды: реальный браузер на живом стенде aiqa.su/pomidorqa.
// После ДЗ Урока 4: guest2 открывает тот же слот и должен увидеть ошибку.
// Локаторы вынесены наверх файла; в тесте используются устойчивые пользовательские селекторы.
//POMIDORQA_BASE_URL=http://localhost:3000 npx playwright test --project=e2e tests/e2e/booking-flow.spec.ts

type TestUser = {
  name: string;
  email: string;
  password: string;
};

const registerNameInput = (page: Page) =>
  page.getByLabel("Имя");

const registerEmailInput = (page: Page) =>
  page.getByLabel("Email");

const registerPasswordInput = (page: Page) =>
  page.getByLabel("Пароль");

const registerSubmitButton = (page: Page) =>
  page.getByRole("button", { name: "Зарегистрироваться" });

const profileSkillInput = (page: Page) =>
  page.locator("#pomidorqa-profile-skill-input");

const profileSkillTypeSelect = (page: Page) =>
  page.locator("#pomidorqa-profile-skill-type");

const profileSkillSubmitButton = (page: Page) =>
  page.getByRole("button", { name: "Добавить" });

const canHelpSkillTags = (page: Page) =>
  page.locator("[data-skill-tag]");

const slotsDateInput = (page: Page) =>
  page.locator("#pomidorqa-slots-date");

const slotsTimeInput = (page: Page) =>
  page.locator("#pomidorqa-slots-time");

const slotsAddSubmitButton = (page: Page) =>
  page.getByRole("button", { name: "Добавить слот" });

const freeSlotCard = (page: Page) =>
  page.locator('[data-slot-status="free"]');

const catalogSkillFilterInput = (page: Page) =>
  page.locator("#pomidorqa-catalog-skill-filter");

const catalogFilterSubmitButton = (page: Page) =>
  page.getByRole("button", { name: "Найти" });

const catalogPersonCard = (page: Page) =>
  page.getByTestId("person-card");

const personNameHeading = (page: Page) =>
  page.getByRole("heading", { level: 1 });

const bookingCalendarDay = (page: Page) =>
  page.locator("button[data-date]");

const bookingCalendarTime = (page: Page) =>
  page.locator("button[data-slot-id]");

const bookingConfirmTitle = (page: Page) =>
  page.getByRole("heading", {
    name: "Подтвердить бронирование?",
  });

const bookingConfirmButton = (page: Page) =>
  page.getByRole("button", { name: "Подтвердить" });

const bookingSuccessMessage = (page: Page) =>
  page.getByRole("status");

const bookingErrorMessage = (page: Page) =>
  page.getByRole("alert").filter({
    hasText: "Этот слот только что забронировали",
  });

const upcomingMeetingsSection = (page: Page) =>
  page.getByTestId("upcoming-meetings");

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
    await profileSkillInput(hostPage).fill(skillTag);
    await profileSkillTypeSelect(hostPage).selectOption("can_help");
    await profileSkillSubmitButton(hostPage).click();
    await expect(canHelpSkillTags(hostPage)).toContainText(skillTag);
  });

  await test.step("Хост: добавляет свободный слот на завтра", async () => {
    await hostPage.goto("/pomidorqa/profile/slots");
    const tomorrow = new Date(Date.now() + 24 * 60 * 60 * 1000);
    const date = tomorrow.toISOString().slice(0, 10);
    await slotsDateInput(hostPage).fill(date);
    await slotsTimeInput(hostPage).fill("12:00");
    await slotsAddSubmitButton(hostPage).click();
    await expect(freeSlotCard(hostPage).first()).toBeVisible();
  });

  await test.step("Гость: регистрируется отдельным аккаунтом", async () => {
    await registerUser(guestPage, guest);
  });

  await test.step("Гость: ищет хоста в каталоге по навыку (сценарий 9)", async () => {
    await catalogSkillFilterInput(guestPage).fill(skillTag);
    await catalogFilterSubmitButton(guestPage).click();
    await expect(
      catalogPersonCard(guestPage).filter({ hasText: host.name })
    ).toBeVisible();
  });

  await test.step("Гость: открывает карточку хоста", async () => {
    await catalogPersonCard(guestPage).filter({ hasText: host.name }).click();
    await expect(personNameHeading(guestPage)).toHaveText(host.name);
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
    await expect(bookingConfirmTitle(guestPage)).toBeVisible();
  });

  // Важно для разбора ДЗ 4: модалку guest2 открываем ДО confirm у guest.
  // Пока слот в UI ещё свободен — оба «человек открыл и отошёл».
  await test.step("Гость2: регистрируется и тоже открывает окно бронирования на тот же слот", async () => {
    await registerUser(guest2Page, guest2);
    await catalogSkillFilterInput(guest2Page).fill(skillTag);
    await catalogFilterSubmitButton(guest2Page).click();
    await catalogPersonCard(guest2Page).filter({ hasText: host.name }).click();
    await expect(personNameHeading(guest2Page)).toHaveText(host.name);

    await expect(async () => {
      const dayChip = bookingCalendarDay(guest2Page).first();
      if (!(await dayChip.isVisible().catch(() => false))) {
        await guest2Page.reload();
      }
      await expect(dayChip).toBeVisible();
    }).toPass({ timeout: 10_000 });

    await bookingCalendarDay(guest2Page).first().click();
    await bookingCalendarTime(guest2Page).first().click();
    await expect(bookingConfirmTitle(guest2Page)).toBeVisible();
  });

  await test.step("Гость: подтверждает бронирование первым — успех", async () => {
    await bookingConfirmButton(guestPage).click();
    const success = bookingSuccessMessage(guestPage);
    const error = bookingErrorMessage(guestPage);
    await expect(success.or(error).first()).toBeVisible({ timeout: 15_000 });
    if (await error.isVisible().catch(() => false)) {
      throw new Error(`Бронирование не удалось: ${await error.textContent()}`);
    }
  });

  await test.step("Гость2: пытается забронировать тот же слот вторым — видит ошибку", async () => {
    await bookingConfirmButton(guest2Page).click();
    await expect(bookingErrorMessage(guest2Page)).toBeVisible({
      timeout: 15_000,
    });
  });

  await test.step("Гость: видит бронирование в разделе «Мои встречи»", async () => {
    await expect(async () => {
      await guestPage.goto("/pomidorqa/bookings");
      await expect(upcomingMeetingsSection(guestPage)).toContainText(host.name);
    }).toPass({ timeout: 10_000 });
  });

  await test.step("Хост: тоже видит это бронирование в своих «Мои встречи»", async () => {
    await expect(async () => {
      await hostPage.goto("/pomidorqa/bookings");
      await expect(upcomingMeetingsSection(hostPage)).toContainText(guest.name);
    }).toPass({ timeout: 10_000 });
  });

  await hostContext.close();
  await guestContext.close();
  await guest2Context.close();
});
