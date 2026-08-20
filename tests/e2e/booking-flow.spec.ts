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
  await LOCATORS.auth.name(page).fill(user.name);
  await LOCATORS.auth.email(page).fill(user.email);
  await LOCATORS.auth.password(page).fill(user.password);
  await LOCATORS.auth.registerSubmit(page).click();
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
    await LOCATORS.profile.addSkillInput(hostPage).fill(skillTag);
    await LOCATORS.profile.addSkillType(hostPage).selectOption("can_help");
    await LOCATORS.profile.addSkillSubmit(hostPage).click();
    await expect(LOCATORS.profile.canHelpSkill(hostPage, skillTag)).toBeVisible();
  });

  await test.step("Хост: добавляет свободный слот на завтра", async () => {
    await hostPage.goto("/pomidorqa/profile/slots");
    const tomorrow = new Date(Date.now() + 24 * 60 * 60 * 1000);
    const date = tomorrow.toISOString().slice(0, 10);
    await LOCATORS.slots.date(hostPage).fill(date);
    await LOCATORS.slots.time(hostPage).fill("12:00");
    await LOCATORS.slots.addSubmit(hostPage).click();
    await expect(LOCATORS.slots.cardTime(hostPage, "12:00").first()).toBeVisible();
  });

  await test.step("Гость: регистрируется отдельным аккаунтом", async () => {
    await registerUser(guestPage, guest);
  });

  await test.step("Гость: ищет хоста в каталоге по навыку (сценарий 9)", async () => {
    await LOCATORS.catalog.skillFilter(guestPage).fill(skillTag);
    await LOCATORS.catalog.search(guestPage).click();
    await expect(
      LOCATORS.catalog.card(guestPage).filter({ hasText: host.name })
    ).toBeVisible();
  });

  await test.step("Гость: открывает карточку хоста", async () => {
    await LOCATORS.catalog.card(guestPage).filter({ hasText: host.name }).click();
    await expect(LOCATORS.bookings.personName(guestPage)).toHaveText(host.name);
  });

  await test.step("Гость: кликает по дню и времени в календаре слотов", async () => {
    await expect(async () => {
      const dayChip = LOCATORS.booking.day(guestPage).first();
      if (!(await dayChip.isVisible().catch(() => false))) {
        await guestPage.reload();
      }
      await expect(dayChip).toBeVisible();
    }).toPass({ timeout: 10_000 });

    await LOCATORS.booking.day(guestPage).first().click();
    await LOCATORS.booking.timeSlot(guestPage).first().click();
    await expect(LOCATORS.booking.dialog(guestPage)).toBeVisible();
  });

  // Важно для разбора ДЗ 4: модалку guest2 открываем ДО confirm у guest.
  // Пока слот в UI ещё свободен — оба «человек открыл и отошёл».
  await test.step("Гость2: регистрируется и тоже открывает окно бронирования на тот же слот", async () => {
    await registerUser(guest2Page, guest2);

    await LOCATORS.catalog.skillFilter(guest2Page).fill(skillTag);
    await LOCATORS.catalog.search(guest2Page).click();
    await LOCATORS.catalog.card(guest2Page).filter({ hasText: host.name }).click();
    await expect(LOCATORS.bookings.personName(guest2Page)).toHaveText(host.name);

    await expect(async () => {
      const dayChip = LOCATORS.booking.day(guest2Page).first();
      if (!(await dayChip.isVisible().catch(() => false))) {
        await guest2Page.reload();
      }
      await expect(dayChip).toBeVisible();
    }).toPass({ timeout: 10_000 });

    await LOCATORS.booking.day(guest2Page).first().click();
    await LOCATORS.booking.timeSlot(guest2Page).first().click();
    await expect(LOCATORS.booking.dialog(guest2Page)).toBeVisible();
  });

  await test.step("Гость: подтверждает бронирование первым — успех", async () => {
    await LOCATORS.booking.confirm(guestPage).click();
    const success = LOCATORS.booking.success(guestPage);
    const error = LOCATORS.booking.error(guestPage);
    await expect(success.or(error)).toBeVisible({ timeout: 15_000 });
    if (await error.isVisible().catch(() => false)) {
      throw new Error(`Бронирование не удалось: ${await error.textContent()}`);
    }
  });

  await test.step("Гость2: пытается забронировать тот же слот вторым — видит ошибку", async () => {
    await LOCATORS.booking.confirm(guest2Page).click();

    const success2 = LOCATORS.booking.success(guest2Page);
    const error2 = LOCATORS.booking.error(guest2Page);
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
      await expect(LOCATORS.bookings.upcomingSection(guestPage)).toContainText(host.name);
    }).toPass({ timeout: 10_000 });
  });

  await test.step("Хост: тоже видит это бронирование в своих «Мои встречи»", async () => {
    await expect(async () => {
      await hostPage.goto("/pomidorqa/bookings");
      await expect(LOCATORS.bookings.upcomingSection(hostPage)).toContainText(guest.name);
    }).toPass({ timeout: 10_000 });
  });

  await hostContext.close();
  await guestContext.close();
  await guest2Context.close();
});
