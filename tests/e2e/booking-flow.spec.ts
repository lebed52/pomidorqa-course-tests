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

async function registerUser(page: Page, user: TestUser) {
  await page.goto("/pomidorqa/auth/register");
  await page.locator("#pomidorqa-register-name").fill(user.name);
  await page.locator("#pomidorqa-register-email").fill(user.email);
  await page.locator("#pomidorqa-register-password").fill(user.password);
  await page.getByRole("button", {name: "Зарегистрироваться"}).click();
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


// Локаторы

// Локаторы хоста
const hostLocators = {
  skillInput: hostPage.locator("#pomidorqa-profile-skill-input"),
  skillType: hostPage.locator("#pomidorqa-profile-skill-type"),
  addSkillButton: hostPage.getByRole("button", {name: "Добавить",}),
  canHelpSkills: hostPage.getByTestId("can-help-skills"),

  dateInput: hostPage.getByLabel("Дата"),
  timeInput: hostPage.getByLabel("Время начала"),
  addSlotButton: hostPage.getByRole("button", {name: "Добавить слот",}),
  slotCard: hostPage.locator("[data-slot-id]").first(),
  bookingCard: hostPage.getByTestId("upcoming-meetings").getByText(guest.name),
};

// Локаторы гостя

const guestLocators = {
  filterInput: guestPage.getByPlaceholder("Playwright, SQL, собеседования..."),
  findButton: guestPage.getByRole("button", {name: "Найти",}),
  personCard: guestPage.getByTestId("person-card"),
  personName: guestPage.getByRole("heading", {level: 1,}),

  calendarDay: guestPage.getByRole("group", {name: "Дни со слотами",}).getByRole("button", {name: "сб, 15 авг",}).first(),
  calendarTime: guestPage.getByRole("group", {name: "Время слотов",}).getByRole("button", {name: ":00",}).first(),
  bookingDialog: guestPage.getByRole("dialog"),
  confirmButton: guestPage.getByRole("button", {name: "Подтвердить",}),
  bookingSuccess: guestPage.getByText("Забронировано! Договоритесь о ссылке на звонок — она в разделе «Мои встречи»"),
  bookingError: guestPage.getByText("Этот слот только что забронировали — выбери другой"),
  bookingCard: guestPage.getByTestId("upcoming-meetings").getByText(host.name),
};

// Локаторы гостя2

const guest2Locators = {
filterInput: guest2Page.getByPlaceholder("Playwright, SQL, собеседования..."),
  findButton: guest2Page.getByRole("button", {name: "Найти",}),
  personCard: guest2Page.getByTestId("person-card"),
  personName: guest2Page.getByRole("heading", {level: 1,}),

  calendarDay: guest2Page.getByRole("group", {name: "Дни со слотами",}).getByRole("button", {name: "сб, 15 авг",}).first(),
  calendarTime: guest2Page.getByRole("group", {name: "Время слотов",}).getByRole("button", {name: ":00",}).first(),
  bookingDialog: guest2Page.getByRole("dialog"),
  confirmButton: guest2Page.getByRole("button", {name: "Подтвердить",}),
  bookingSuccess: guest2Page.getByText("Забронировано! Договоритесь о ссылке на звонок — она в разделе «Мои встречи»"),
  bookingError: guest2Page.getByText("Этот слот только что забронировали — выбери другой"),
};


  await test.step("Хост: регистрируется в PomidorQA", async () => {
    await registerUser(hostPage, host);
  });

  await test.step('Хост: добавляет навык «могу помочь» в профиле', async () => {
    await hostPage.goto("/pomidorqa/profile");
    await hostLocators.skillInput.fill(skillTag);
    await hostLocators.skillType.selectOption("can_help");
    await hostLocators.addSkillButton.click();
    await expect(hostLocators.canHelpSkills).toContainText(skillTag);
  });

  await test.step("Хост: добавляет свободный слот на завтра", async () => {
    await hostPage.goto("/pomidorqa/profile/slots");
    const tomorrow = new Date(Date.now() + 24 * 60 * 60 * 1000);
    const date = tomorrow.toISOString().slice(0, 10);
    await hostLocators.dateInput.fill(date);
    await hostLocators.timeInput.fill("12:00");
    await hostLocators.addSlotButton.click();
    await expect(hostLocators.slotCard).toBeVisible();
  });

  await test.step("Гость: регистрируется отдельным аккаунтом", async () => {
    await registerUser(guestPage, guest);
  });

  await test.step("Гость: ищет хоста в каталоге по навыку (сценарий 9)", async () => {
    await guestLocators.filterInput.fill(skillTag);
    await guestLocators.findButton.click();
    await expect(
      guestLocators.personCard.filter({ hasText: host.name })).toBeVisible();
  });

  await test.step("Гость: открывает карточку хоста", async () => {
    await guestLocators.personCard.filter({ hasText: host.name }).click();
    await expect(guestLocators.personName).toHaveText(host.name);
  });

  await test.step("Гость: кликает по дню и времени в календаре слотов", async () => {
    await expect(async () => {
      if (!(await guestLocators.calendarDay.isVisible().catch(() => false))) {
        await guestPage.reload();
      }
      await expect(guestLocators.calendarDay).toBeVisible();
    }).toPass({ timeout: 10_000 });

    await guestLocators.calendarDay.click();
    await guestLocators.calendarTime.click();
    await expect(guestLocators.bookingDialog).toBeVisible();
  });

  // Важно для разбора ДЗ 4: модалку guest2 открываем ДО confirm у guest.
  // Пока слот в UI ещё свободен — оба «человек открыл и отошёл».
  // Дополнительно добавил функцию регистрации для гостя2
  await test.step("Гость2: регистрируется и тоже открывает окно бронирования на тот же слот", async () => {
    await registerUser(guest2Page, guest2);

    await guest2Locators.filterInput.fill(skillTag);
    await guest2Locators.findButton.click();
    await guest2Locators.personCard.filter({ hasText: host.name }).click();
    await expect(guest2Locators.personName).toHaveText(host.name);

    await expect(async () => {
      if (!(await guest2Locators.calendarDay.isVisible().catch(() => false))) {
        await guest2Page.reload();
      }
      await expect(guest2Locators.calendarDay).toBeVisible();
    }).toPass({ timeout: 10_000 });

    await guest2Locators.calendarDay.click();
    await guest2Locators.calendarTime.click();
    await expect(guest2Locators.bookingDialog).toBeVisible();
  });

  await test.step("Гость: подтверждает бронирование первым — успех", async () => {
    await guestLocators.confirmButton.click();
    await expect(guestLocators.bookingSuccess.or(guestLocators.bookingError)).toBeVisible({ timeout: 15_000 });
    if (await guestLocators.bookingError.isVisible().catch(() => false)) {
      throw new Error(`Бронирование не удалось: ${await guestLocators.bookingError.textContent()}`);
    }
  });

  await test.step("Гость2: пытается забронировать тот же слот вторым — видит ошибку", async () => {
    await guest2Page.getByRole("button", { name: "Подтвердить" }).click();

    await expect(guest2Locators.bookingSuccess.or(guest2Locators.bookingError)).toBeVisible({ timeout: 15_000 });

    // Полярность наоборот относительно гостя 1: ошибка — ожидаемый результат
    if (await guest2Locators.bookingSuccess.isVisible().catch(() => false)) {
      throw new Error("Слот должен был быть занят, но бронирование прошло успешно");
    }
    await expect(guest2Locators.bookingError).toBeVisible();
  });

  await test.step("Гость: видит бронирование в разделе «Мои встречи»", async () => {
    await expect(async () => {
      await guestPage.goto("/pomidorqa/bookings");
      await expect(guestLocators.bookingCard).toHaveText(host.name);
    }).toPass({ timeout: 10_000 });
  });

  await test.step("Хост: тоже видит это бронирование в своих «Мои встречи»", async () => {
    await expect(async () => {
      await hostPage.goto("/pomidorqa/bookings");
      await expect(hostLocators.bookingCard).toHaveText(guest.name);
    }).toPass({ timeout: 10_000 });
  });

  await hostContext.close();
  await guestContext.close();
  await guest2Context.close();
});
