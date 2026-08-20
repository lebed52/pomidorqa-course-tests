import { test, expect, type Page } from "@playwright/test";

// E2E-уровень пирамиды: реальный браузер на живом стенде aiqa.su/pomidorqa.
// После ДЗ Урока 4: guest2 открывает тот же слот и должен увидеть ошибку.
// host/guest уже через registerUser; регистрация guest2 пока инлайн — это заготовка к ДЗ Урока 5.
//POMIDORQA_BASE_URL=http://localhost:3000 npx playwright test --project=e2e tests/e2e/booking-flow.spec.ts

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
//Локаторы
const registerNameInput = (page: Page) => page.getByLabel("Имя");
const registerEmailInput = (page: Page) => page.getByLabel("Email");
const registerPasswordInput = (page: Page) => page.getByLabel("Пароль");
const registerSubmitButton = (page: Page) => page.getByRole("button", { name: "Зарегистрироваться" });

const profileSkillInput = (page: Page) => page.locator("#pomidorqa-profile-skill-input");
const profileSkillTypeSelect = (page: Page) => page.locator("#pomidorqa-profile-skill-type");
const profileSkillSubmit = (page: Page) => page.getByRole("button", { name: "Добавить" });
const profileCanHelpSkills = (page: Page) => page.getByTestId("can-help-skills");

const slotsDateInput = (page: Page) => page.locator("#pomidorqa-slots-date");
const slotsTimeInput = (page: Page) => page.locator("#pomidorqa-slots-time");
const slotsAddSubmit = (page: Page) => page.getByRole("button", { name: "Добавить слот" });
const slotsCard = (page: Page) => page.locator("[data-slot-id]");

const catalogFilterInput = (page: Page) => page.locator("#pomidorqa-catalog-skill-filter");
const catalogFilterSubmit = (page: Page) => page.getByRole("button", { name: "Найти" });
const catalogCard = (page: Page) => page.getByTestId("person-card");

const personName = (page: Page) => page.getByRole("heading", { level: 1 });

const bookingCalendarDay = (page: Page) =>
  page.getByRole("group", { name: "Дни со слотами" }).getByRole("button");
const bookingCalendarTime = (page: Page) =>
  page.getByRole("group", { name: "Время слотов" }).getByRole("button");

const bookingConfirmDialog = (page: Page) => page.getByRole("dialog");
const bookingConfirmButton = (page: Page) =>
  page.getByRole("dialog").getByRole("button", { name: "Подтвердить" });
const bookingConfirmSuccess = (page: Page) => page.getByRole("dialog").getByRole("status");
const bookingConfirmError = (page: Page) => page.getByRole("dialog").getByRole("alert");

const bookingsUpcomingSection = (page: Page) => page.getByTestId("upcoming-meetings");
const bookingsCardName = (page: Page) =>
  bookingsUpcomingSection(page).locator("[data-booking-id]").first().locator("p").first();


const LOCATORS = {
  auth: {
    name: (page: Page) => page.getByLabel("Имя"),
    email: (page: Page) => page.getByLabel("Email"),
    password: (page: Page) => page.getByLabel("Пароль"),
    registerSubmit: (page: Page) =>
      page.getByRole("button", { name: "Зарегистрироваться" }),
  },
  catalog: {
    skillFilter: (page: Page) => page.getByLabel("Навык"),
    search: (page: Page) => page.getByRole("button", { name: "Найти" }),
    card: (page: Page) => page.getByTestId("person-card"),
  },
  profile: {
    addSkillInput: (page: Page) => page.getByLabel("Навык"),
    addSkillType: (page: Page) => page.getByLabel("Тип"),
    addSkillSubmit: (page: Page) => page.getByRole("button", { name: "Добавить" }),
    canHelpSkill: (page: Page, skillTag: string) => page.getByText(skillTag),
  },
  slots: {
    date: (page: Page) => page.getByLabel("Дата"),
    time: (page: Page) => page.getByLabel("Время"),
    addSubmit: (page: Page) => page.getByRole("button", { name: "Добавить слот" }),
    cardTime: (page: Page, time: string) => page.getByText(time),
  },
  booking: {
    daysGroup: (page: Page) => page.getByRole("group", { name: "Дни со слотами" }),
    day: (page: Page) =>
      page.getByRole("group", { name: "Дни со слотами" }).locator("[data-date]"),
    timeSlot: (page: Page) => page.locator("[data-slot-id]"),
    dialog: (page: Page) => page.getByRole("dialog"),
    confirm: (page: Page) => page.getByRole("button", { name: "Подтвердить" }),
    success: (page: Page) => page.getByRole("dialog").getByText("Забронировано!"),
    error: (page: Page) => page.getByRole("dialog").getByRole("alert"),
  },
  bookings: {
    upcomingSection: (page: Page) => page.getByTestId("upcoming-meetings"),
    personName: (page: Page) => page.getByRole("heading", { level: 1 }),
  },
} as const;

async function registerUser(page: Page, user: TestUser) {
  await page.goto("/pomidorqa/auth/register");
<<<<<<< HEAD
  await LOCATORS.auth.name(page).fill(user.name);
  await LOCATORS.auth.email(page).fill(user.email);
  await LOCATORS.auth.password(page).fill(user.password);
  await LOCATORS.auth.registerSubmit(page).click();
=======
  await registerNameInput(page).fill(user.name);
  await registerEmailInput(page).fill(user.email);
  await registerPasswordInput(page).fill(user.password);
  await registerSubmitButton(page).click();
>>>>>>> 640194475757926adfcd88a5f4512c06286571b0
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
<<<<<<< HEAD
    await LOCATORS.profile.addSkillInput(hostPage).fill(skillTag);
    await LOCATORS.profile.addSkillType(hostPage).selectOption("can_help");
    await LOCATORS.profile.addSkillSubmit(hostPage).click();
    await expect(LOCATORS.profile.canHelpSkill(hostPage, skillTag)).toBeVisible();
=======
    await profileSkillInput(hostPage).fill(skillTag);
    await profileSkillTypeSelect(hostPage).selectOption("can_help");
    await profileSkillSubmit(hostPage).click();
    await expect(profileCanHelpSkills(hostPage)).toContainText(skillTag);
>>>>>>> 640194475757926adfcd88a5f4512c06286571b0
  });

  await test.step("Хост: добавляет свободный слот на завтра", async () => {
    await hostPage.goto("/pomidorqa/profile/slots");
    const tomorrow = new Date(Date.now() + 24 * 60 * 60 * 1000);
    const date = tomorrow.toISOString().slice(0, 10);
<<<<<<< HEAD
    await LOCATORS.slots.date(hostPage).fill(date);
    await LOCATORS.slots.time(hostPage).fill("12:00");
    await LOCATORS.slots.addSubmit(hostPage).click();
    await expect(LOCATORS.slots.cardTime(hostPage, "12:00").first()).toBeVisible();
=======
    await slotsDateInput(hostPage).fill(date);
    await slotsTimeInput(hostPage).fill("12:00");
    await slotsAddSubmit(hostPage).click();
    await expect(slotsCard(hostPage).first()).toBeVisible();
>>>>>>> 640194475757926adfcd88a5f4512c06286571b0
  });

  await test.step("Гость: регистрируется отдельным аккаунтом", async () => {
    await registerUser(guestPage, guest);
  });

  await test.step("Гость: ищет хоста в каталоге по навыку (сценарий 9)", async () => {
<<<<<<< HEAD
    await LOCATORS.catalog.skillFilter(guestPage).fill(skillTag);
    await LOCATORS.catalog.search(guestPage).click();
    await expect(
      LOCATORS.catalog.card(guestPage).filter({ hasText: host.name })
=======
    await catalogFilterInput(guestPage).fill(skillTag);
    await catalogFilterSubmit(guestPage).click();
    await expect(
      catalogCard(guestPage).filter({ hasText: host.name })
>>>>>>> 640194475757926adfcd88a5f4512c06286571b0
    ).toBeVisible();
  });

  await test.step("Гость: открывает карточку хоста", async () => {
<<<<<<< HEAD
    await LOCATORS.catalog.card(guestPage).filter({ hasText: host.name }).click();
    await expect(LOCATORS.bookings.personName(guestPage)).toHaveText(host.name);
=======
    await catalogCard(guestPage).filter({ hasText: host.name }).click();
    await expect(personName(guestPage)).toHaveText(host.name);
>>>>>>> 640194475757926adfcd88a5f4512c06286571b0
  });

  await test.step("Гость: кликает по дню и времени в календаре слотов", async () => {
    await expect(async () => {
<<<<<<< HEAD
      const dayChip = LOCATORS.booking.day(guestPage).first();
=======
      const dayChip = bookingCalendarDay(guestPage).first();
>>>>>>> 640194475757926adfcd88a5f4512c06286571b0
      if (!(await dayChip.isVisible().catch(() => false))) {
        await guestPage.reload();
      }
      await expect(dayChip).toBeVisible();
    }).toPass({ timeout: 10_000 });

<<<<<<< HEAD
    await LOCATORS.booking.day(guestPage).first().click();
    await LOCATORS.booking.timeSlot(guestPage).first().click();
    await expect(LOCATORS.booking.dialog(guestPage)).toBeVisible();
=======
    await bookingCalendarDay(guestPage).first().click();
    await bookingCalendarTime(guestPage).first().click();
    await expect(bookingConfirmDialog(guestPage)).toBeVisible();
>>>>>>> 640194475757926adfcd88a5f4512c06286571b0
  });

  // Важно для разбора ДЗ 4: модалку guest2 открываем ДО confirm у guest.
  // Пока слот в UI ещё свободен — оба «человек открыл и отошёл».
  await test.step("Гость2: регистрируется и тоже открывает окно бронирования на тот же слот", async () => {
    await registerUser(guest2Page, guest2);

<<<<<<< HEAD
    await LOCATORS.catalog.skillFilter(guest2Page).fill(skillTag);
    await LOCATORS.catalog.search(guest2Page).click();
    await LOCATORS.catalog.card(guest2Page).filter({ hasText: host.name }).click();
    await expect(LOCATORS.bookings.personName(guest2Page)).toHaveText(host.name);

    await expect(async () => {
      const dayChip = LOCATORS.booking.day(guest2Page).first();
=======
    await catalogFilterInput(guest2Page).fill(skillTag);
    await catalogFilterSubmit(guest2Page).click();
    await catalogCard(guest2Page).filter({ hasText: host.name }).click();
    await expect(personName(guest2Page)).toHaveText(host.name);

    await expect(async () => {
      const dayChip = bookingCalendarDay(guest2Page).first();
>>>>>>> 640194475757926adfcd88a5f4512c06286571b0
      if (!(await dayChip.isVisible().catch(() => false))) {
        await guest2Page.reload();
      }
      await expect(dayChip).toBeVisible();
    }).toPass({ timeout: 10_000 });

<<<<<<< HEAD
    await LOCATORS.booking.day(guest2Page).first().click();
    await LOCATORS.booking.timeSlot(guest2Page).first().click();
    await expect(LOCATORS.booking.dialog(guest2Page)).toBeVisible();
  });

  await test.step("Гость: подтверждает бронирование первым — успех", async () => {
    await LOCATORS.booking.confirm(guestPage).click();
    const success = LOCATORS.booking.success(guestPage);
    const error = LOCATORS.booking.error(guestPage);
=======
    await bookingCalendarDay(guest2Page).first().click();
    await bookingCalendarTime(guest2Page).first().click();
    await expect(bookingConfirmDialog(guest2Page)).toBeVisible();
  });

  await test.step("Гость: подтверждает бронирование первым — успех", async () => {
    await bookingConfirmButton(guestPage).click();
    const success = bookingConfirmSuccess(guestPage);
    const error = bookingConfirmError(guestPage);
>>>>>>> 640194475757926adfcd88a5f4512c06286571b0
    await expect(success.or(error)).toBeVisible({ timeout: 15_000 });
    if (await error.isVisible().catch(() => false)) {
      throw new Error(`Бронирование не удалось: ${await error.textContent()}`);
    }
  });

  await test.step("Гость2: пытается забронировать тот же слот вторым — видит ошибку", async () => {
<<<<<<< HEAD
    await LOCATORS.booking.confirm(guest2Page).click();

    const success2 = LOCATORS.booking.success(guest2Page);
    const error2 = LOCATORS.booking.error(guest2Page);
=======
    await bookingConfirmButton(guest2Page).click();

    const success2 = bookingConfirmSuccess(guest2Page);
    const error2 = bookingConfirmError(guest2Page);
>>>>>>> 640194475757926adfcd88a5f4512c06286571b0
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
<<<<<<< HEAD
      await expect(LOCATORS.bookings.upcomingSection(guestPage)).toContainText(host.name);
=======
      const card = bookingsCardName(guestPage);
      await expect(card).toHaveText(host.name);
>>>>>>> 640194475757926adfcd88a5f4512c06286571b0
    }).toPass({ timeout: 10_000 });
  });

  await test.step("Хост: тоже видит это бронирование в своих «Мои встречи»", async () => {
    await expect(async () => {
      await hostPage.goto("/pomidorqa/bookings");
<<<<<<< HEAD
      await expect(LOCATORS.bookings.upcomingSection(hostPage)).toContainText(guest.name);
=======
      const card = bookingsCardName(hostPage);
      await expect(card).toHaveText(guest.name);
>>>>>>> 640194475757926adfcd88a5f4512c06286571b0
    }).toPass({ timeout: 10_000 });
  });

  await hostContext.close();
  await guestContext.close();
  await guest2Context.close();
});
