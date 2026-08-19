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

const selectors = {
  register: {
    nameInput: "id=pomidorqa-register-name",
    emailInput: "id=pomidorqa-register-email",
    passwordInput: "id=pomidorqa-register-password",
    submit: "button:has-text('Зарегистрироваться')",
  },
  profile: {
    addSkillInput: "id=pomidorqa-profile-skill-input",
    addSkillTypeSelect: "id=pomidorqa-profile-skill-type",
    addSkillSubmit: "button:has-text('Добавить')",
    canHelpSkills: (page: Page) =>
      page.getByTestId("can-help-skills").locator("form"),
  },
  slots: {
    dateInput: "id=pomidorqa-slots-date",
    timeInput: "id=pomidorqa-slots-time",
    addSubmit: "button:has-text('Добавить слот')",
    card: "[data-slot-status='free']",
  },
  catalog: {
    filterInput: "id=pomidorqa-catalog-skill-filter",
    filterSubmit: "button:has-text('Найти')",
    card: "data-testid=person-card",
  },
  person: {
    name: (page: Page) =>
      page.getByRole("heading", { level: 1 }),
  },
  bookingCalendar: {
    day: (page: Page) =>
      page.getByRole("group", { name: "Дни со слотами" }).locator("button"),
    time: (page: Page) =>
      page.getByRole("group", { name: "Время слотов" }).locator("button"),
  },
  bookingConfirmModal: {
    dialog: (page: Page) => page.getByRole("dialog"),
    confirm: (page: Page) => page.getByRole("button", { name: "Подтвердить" }),
    success: (page: Page) => page.getByText("Забронировано!"),
    error: (page: Page) =>
      page.getByText("Этот слот только что забронировали — выбери другой"),
  },
  bookings: {
    upcomingSection: (page: Page) => page.getByTestId("upcoming-meetings"),
    cardName: (page: Page, skillTag: string) =>
      page
        .getByTestId("upcoming-meetings")
        .locator("div > div > p")
        .first(),
  },
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
  await page.locator(selectors.register.nameInput).fill(user.name);
  await page.locator(selectors.register.emailInput).fill(user.email);
  await page.locator(selectors.register.passwordInput).fill(user.password);
  await page.locator(selectors.register.submit).click();
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
    await hostPage.locator(selectors.profile.addSkillInput).fill(skillTag);
    await hostPage.locator(selectors.profile.addSkillTypeSelect).selectOption("can_help");
    await hostPage.locator(selectors.profile.addSkillSubmit).click();
    await expect(selectors.profile.canHelpSkills(hostPage)).toContainText(skillTag);
  });

  await test.step("Хост: добавляет свободный слот на завтра", async () => {
    await hostPage.goto("/pomidorqa/profile/slots");
    const tomorrow = new Date(Date.now() + 24 * 60 * 60 * 1000);
    const date = tomorrow.toISOString().slice(0, 10);
    await hostPage.locator(selectors.slots.dateInput).fill(date);
    await hostPage.locator(selectors.slots.timeInput).fill("12:00");
    await hostPage.locator(selectors.slots.addSubmit).click();
    await expect(hostPage.locator(selectors.slots.card).first()).toBeVisible();
  });

  await test.step("Гость: регистрируется отдельным аккаунтом", async () => {
    await registerUser(guestPage, guest);
  });

  await test.step("Гость: ищет хоста в каталоге по навыку (сценарий 9)", async () => {
    await guestPage.locator(selectors.catalog.filterInput).fill(skillTag);
    await guestPage.locator(selectors.catalog.filterSubmit).click();
    await expect(
      guestPage.locator(selectors.catalog.card).filter({ hasText: host.name })
    ).toBeVisible();
  });

  await test.step("Гость: открывает карточку хоста", async () => {
    await guestPage.locator(selectors.catalog.card).filter({ hasText: host.name }).click();
    await expect(selectors.person.name(guestPage)).toHaveText(host.name);
  });

  await test.step("Гость: кликает по дню и времени в календаре слотов", async () => {
    await expect(async () => {
      const dayChip = selectors.bookingCalendar.day(guestPage).first();
      if (!(await dayChip.isVisible().catch(() => false))) {
        await guestPage.reload();
      }
      await expect(dayChip).toBeVisible();
    }).toPass({ timeout: 10_000 });

    await selectors.bookingCalendar.day(guestPage).first().click();
    await selectors.bookingCalendar.time(guestPage).first().click();
    await expect(selectors.bookingConfirmModal.dialog(guestPage)).toBeVisible();
  });

  // Важно для разбора ДЗ 4: модалку guest2 открываем ДО confirm у guest.
  // Пока слот в UI ещё свободен — оба «человек открыл и отошёл».
  await test.step("Гость2: регистрируется и тоже открывает окно бронирования на тот же слот", async () => {
    await registerUser(guest2Page, guest2);

    await guest2Page.locator(selectors.catalog.filterInput).fill(skillTag);
    await guest2Page.locator(selectors.catalog.filterSubmit).click();
    await guest2Page.locator(selectors.catalog.card).filter({ hasText: host.name }).click();
    await expect(selectors.person.name(guest2Page)).toHaveText(host.name);

    await expect(async () => {
      const dayChip = selectors.bookingCalendar.day(guest2Page).first();
      if (!(await dayChip.isVisible().catch(() => false))) {
        await guest2Page.reload();
      }
      await expect(dayChip).toBeVisible();
    }).toPass({ timeout: 10_000 });

    await selectors.bookingCalendar.day(guest2Page).first().click();
    await selectors.bookingCalendar.time(guest2Page).first().click();
    await expect(selectors.bookingConfirmModal.dialog(guest2Page)).toBeVisible();
  });

  await test.step("Гость: подтверждает бронирование первым — успех", async () => {
    await selectors.bookingConfirmModal.confirm(guestPage).click();
    const success = selectors.bookingConfirmModal.success(guestPage);
    const error = selectors.bookingConfirmModal.error(guestPage);
    await expect(success.or(error)).toBeVisible({ timeout: 15_000 });
    if (await error.isVisible().catch(() => false)) {
      throw new Error(`Бронирование не удалось: ${await error.textContent()}`);
    }
  });

  await test.step("Гость2: пытается забронировать тот же слот вторым — видит ошибку", async () => {
    await selectors.bookingConfirmModal.confirm(guest2Page).click();

    const success2 = selectors.bookingConfirmModal.success(guest2Page);
    const error2 = selectors.bookingConfirmModal.error(guest2Page);
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
      const card = selectors.bookings.cardName(guestPage, skillTag);
      await expect(card).toContainText(host.name);
    }).toPass({ timeout: 10_000 });
  });

  await test.step("Хост: тоже видит это бронирование в своих «Мои встречи»", async () => {
    await expect(async () => {
      await hostPage.goto("/pomidorqa/bookings");
      const card = selectors.bookings.cardName(hostPage, skillTag);
      await expect(card).toContainText(guest.name);
    }).toPass({ timeout: 10_000 });
  });

  await hostContext.close();
  await guestContext.close();
  await guest2Context.close();
});
