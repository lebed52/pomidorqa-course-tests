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
  await locators.nameInput(page).fill(user.name);
  await locators.emailInput(page).fill(user.email);
  await locators.passwordInput(page).fill(user.password);
  await locators.registerButton(page).click();
  await expect(page).toHaveURL(/\/pomidorqa\/?$/);
}

const locators = {
  nameInput: (page: Page) => page.getByLabel('Имя'),
  emailInput: (page: Page) => page.getByLabel('Email'),
  passwordInput: (page: Page) => page.getByLabel('Пароль'),
  registerButton: (page: Page) => page.getByRole('button').filter({hasText:'Зарегистрироваться'}),
  skillInput: (page: Page) => page.getByLabel('Навык'),
  skillTypeSelect: (page: Page) => page.getByLabel('Тип'),
  addSkillButton: (page: Page) => page.getByRole('button').filter({hasText:'Добавить'}),
  canHelpSkills: (page: Page) => page.getByTitle('Убрать').nth(0),
  slotDateInput: (page: Page) => page.getByLabel('Дата'),
  slotTimeInput: (page: Page) => page.getByLabel('Время начала'),
  addSlotButton: (page: Page) => page.getByText('Добавить слот'),
  slotCard: (page: Page) => page.locator('[data-slot-status="free"]').first(),
  catalogFilter: (page: Page) => page.getByLabel('Навык'),
  catalogSearchButton: (page: Page) => page.getByRole('button').filter({hasText:'Найти'}),
  personCard: (page: Page, name: string) => 
    page.getByTestId("person-card").filter({ hasText: name }),
  personName: (page: Page) => page.getByRole("heading").nth(0),
  calendarDay: (page: Page) => page.locator('[aria-label="Дни со слотами"]').getByRole('button').first(),
  calendarTime: (page: Page) =>page.locator('[aria-label="Время слотов"]').getByRole('button').first(),
  bookingDialog: (page: Page) => page.getByRole('dialog'),
  confirmButton: (page: Page) => page.locator('[type="submit"]').filter({hasText:'Подтвердить'}),
  successMessage: (page: Page) => page.getByRole('status'),
  errorMessage: (page: Page) => page.getByText("Этот слот только что забронировали"),
  bookingCard: (page: Page, name: string) =>
    page.getByTestId('upcoming-meetings').locator('[data-booking-id]').filter({ hasText: name }).first(),
};

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
    await locators.skillInput(hostPage).fill(skillTag);
    await locators.skillTypeSelect(hostPage).selectOption("can_help");
    await locators.addSkillButton(hostPage).click();
    await expect(locators.canHelpSkills(hostPage)).toContainText(skillTag);
  });

  await test.step("Хост: добавляет свободный слот на завтра", async () => {
    await hostPage.goto("/pomidorqa/profile/slots");
    const tomorrow = new Date(Date.now() + 24 * 60 * 60 * 1000);
    const date = tomorrow.toISOString().slice(0, 10);
    await locators.slotDateInput(hostPage).fill(date);
    await locators.slotTimeInput(hostPage).fill("12:00");
    await locators.addSlotButton(hostPage).click();
    await expect(locators.slotCard(hostPage)).toBeVisible();
  });

  await test.step("Гость: регистрируется отдельным аккаунтом", async () => {
    await registerUser(guestPage, guest);
  });

  await test.step("Гость: ищет хоста в каталоге по навыку (сценарий 9)", async () => {
    await locators.catalogFilter(guestPage).fill(skillTag);
    await locators.catalogSearchButton(guestPage).click();
    await expect(locators.personCard(guestPage, host.name)).toBeVisible();
  });

  await test.step("Гость: открывает карточку хоста", async () => {
    await locators.personCard(guestPage, host.name).click();
    await expect(locators.personName(guestPage)).toHaveText(host.name);
  });

  await test.step("Гость: кликает по дню и времени в календаре слотов", async () => {
    await expect(async () => {
      const dayChip = locators.calendarDay(guestPage);
      if (!(await dayChip.isVisible().catch(() => false))) {
        await guestPage.reload();
      }
      await expect(dayChip).toBeVisible();
    }).toPass({ timeout: 10_000 });

    await locators.calendarDay(guestPage).click();
    await expect(async () => {
      await locators.calendarTime(guestPage).click();
      await expect(locators.bookingDialog(guestPage)).toBeVisible();
    }).toPass({ timeout: 10_000 });
  });

  // Важно для разбора ДЗ 4: модалку guest2 открываем ДО confirm у guest.
  // Пока слот в UI ещё свободен — оба «человек открыл и отошёл».
  await test.step("Гость2: регистрируется и тоже открывает окно бронирования на тот же слот", async () => {
    await guest2Page.goto("/pomidorqa/auth/register");
    await locators.nameInput(guest2Page).fill(guest2.name);
    await locators.emailInput(guest2Page).fill(guest2.email);
    await locators.passwordInput(guest2Page).fill(guest2.password);
    await locators.registerButton(guest2Page).click();
    await expect(guest2Page).toHaveURL(/\/pomidorqa\/?$/);

    await locators.catalogFilter(guest2Page).fill(skillTag);
    await locators.catalogSearchButton(guest2Page).click();
    await locators.personCard(guest2Page, host.name).click();
    await expect(locators.personName(guest2Page)).toHaveText(host.name);

    await expect(async () => {
      const dayChip = locators.calendarDay(guest2Page);
      if (!(await dayChip.isVisible().catch(() => false))) {
        await guest2Page.reload();
      }
      await expect(dayChip).toBeVisible();
    }).toPass({ timeout: 10_000 });

    await locators.calendarDay(guest2Page).click();
    await expect(async () => {
      await locators.calendarTime(guest2Page).click();
      await expect(locators.bookingDialog(guest2Page)).toBeVisible();
    }).toPass({ timeout: 10_000 });
  });

  await test.step("Гость: подтверждает бронирование первым — успех", async () => {
    await locators.confirmButton(guestPage).click();
    const success = locators.successMessage(guestPage);
    const error = locators.errorMessage(guestPage);
    await expect(success.or(error)).toBeVisible({ timeout: 15_000 });
    if (await error.isVisible().catch(() => false)) {
      throw new Error(`Бронирование не удалось: ${await error.textContent()}`);
    }
  });

  await test.step("Гость2: пытается забронировать тот же слот вторым — видит ошибку", async () => {
    await locators.confirmButton(guest2Page).click();

    const success2 = locators.successMessage(guest2Page);
    const error2 = locators.errorMessage(guest2Page);
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
      await expect(locators.bookingCard(guestPage, host.name)).toContainText(host.name);
    }).toPass({ timeout: 10_000 });
  });

  await test.step("Хост: тоже видит это бронирование в своих «Мои встречи»", async () => {
    await expect(async () => {
      await hostPage.goto("/pomidorqa/bookings");
      await expect(locators.bookingCard(hostPage, guest.name)).toContainText(guest.name);
    }).toPass({ timeout: 10_000 });
  });

  await hostContext.close();
  await guestContext.close();
  await guest2Context.close();
});
