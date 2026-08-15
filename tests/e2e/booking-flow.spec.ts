import { test, expect, type Page } from "@playwright/test";

const registerNameInput = (page: Page) => page.locator('#pomidorqa-register-name');
const registerEmailInput = (page: Page) => page.locator('#pomidorqa-register-email');
const registerPasswordInput = (page: Page) => page.locator('#pomidorqa-register-password');
const registerSubmitButton = (page: Page) => page.getByRole('button', { name: 'Зарегистрироваться' });

const profileSkillInput = (page: Page) => page.getByLabel('Навык');
const profileSkillTypeSelect = (page: Page) => page.getByRole('combobox', { name: 'Тип' });
const profileSkillSubmit = (page: Page) => page.getByRole('button', { name: 'Добавить' });
const profileSkillList = (page: Page) => page.locator('[data-testid="can-help-skills"]');

const slotDateInput = (page: Page) => page.locator('input[type="date"]');
const slotTimeInput = (page: Page) => page.locator('input[type="time"]');
const slotAddSubmit = (page: Page) => page.getByRole('button', { name: 'Добавить слот' });
const slotCard = (page: Page) => page.locator('[data-slot-status="free"]').first();

const catalogFilterInput = (page: Page) => page.locator('#pomidorqa-catalog-skill-filter');
const catalogFilterSubmit = (page: Page) => page.getByRole('button', { name: 'Найти' });
const catalogCard = (page: Page, name: string) => page
    .locator('[data-testid="person-card"]')
    .filter({ hasText: name });

const personName = (page: Page) => page.getByRole('heading', { level: 1 });

const bookingDay = (page: Page, date: string) => page.locator(`button[data-date="${date}"]`);
const anyTime = (page: Page) => page.locator('button[data-slot-id]').first();
const bookingDialog = (page: Page) => page.getByRole('dialog');

const bookingConfirmButton = (page: Page) => page.getByRole('button', { name: 'Подтвердить' });
const bookingSuccess = (page: Page) => bookingDialog(page).getByText(/Забронировано|успешно/i);
const bookingError = (page: Page) => bookingDialog(page).getByText(/забронировали|занят|выбери другой/i);

const upcomingSection = (page: Page) => page.locator('[data-testid="upcoming-meetings"]');

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
  await registerNameInput(page).fill(user.name);
  await registerEmailInput(page).fill(user.email);
  await registerPasswordInput(page).fill(user.password);
  await registerSubmitButton(page).click();
  await expect(page).toHaveURL(/\/pomidorqa\/?$/);
}

test("основной путь + гонка за слот", async ({ browser }) => {
  const runId = Date.now();
  const skillTag = `Playwright-demo-${runId}`;
  const tomorrow = new Date(Date.now() + 24 * 60 * 60 * 1000);
  const slotDate = tomorrow.toISOString().slice(0, 10);

  const host = makeUser("host", runId);
  const guest = makeUser("guest", runId);
  const guest2 = makeUser("guest2", runId);

  const hostContext = await browser.newContext();
  const guestContext = await browser.newContext();
  const guest2Context = await browser.newContext();
  const hostPage = await hostContext.newPage();
  const guestPage = await guestContext.newPage();
  const guest2Page = await guest2Context.newPage();

  await test.step("Хост: регистрируется", async () => {
    await registerUser(hostPage, host);
  });

  await test.step("Хост: добавляет навык", async () => {
    await hostPage.goto("/pomidorqa/profile");
    await profileSkillInput(hostPage).fill(skillTag);
    await profileSkillTypeSelect(hostPage).selectOption("can_help");
    await profileSkillSubmit(hostPage).click();
    await expect(profileSkillList(hostPage)).toContainText(skillTag);
  });

  await test.step("Хост: добавляет слот на завтра в 12:00", async () => {
    await hostPage.goto("/pomidorqa/profile/slots");
    await slotDateInput(hostPage).fill(slotDate);
    await slotTimeInput(hostPage).fill("12:00");
    await slotAddSubmit(hostPage).click();
    await expect(slotCard(hostPage)).toBeVisible({ timeout: 15000 });
  });

  await test.step("Гость: регистрируется", async () => {
    await registerUser(guestPage, guest);
  });

  await test.step("Гость: находит хоста в каталоге", async () => {
    await catalogFilterInput(guestPage).fill(skillTag);
    await catalogFilterSubmit(guestPage).click();
    await expect(catalogCard(guestPage, host.name)).toBeVisible();
  });

  await test.step("Гость: открывает карточку хоста", async () => {
    await catalogCard(guestPage, host.name).click();
    await guestPage.waitForTimeout(1000);
    await expect(personName(guestPage)).toHaveText(host.name);
  });

  await test.step("Гость: кликает по дню и времени в календаре слотов", async () => {
    await expect(async () => {
      const dayChip = bookingDay(guestPage, slotDate);
      if (!(await dayChip.isVisible().catch(() => false))) {
        await guestPage.reload();
      }
      await expect(dayChip).toBeVisible();
    }).toPass({ timeout: 10_000 });

    await bookingDay(guestPage, slotDate).click();
    await guestPage.waitForSelector('button[data-slot-id]', { timeout: 10000 });
    const timeButton = anyTime(guestPage);
    await expect(timeButton).toBeVisible({ timeout: 10000 });
    await timeButton.click();
    await expect(bookingDialog(guestPage)).toBeVisible({ timeout: 10000 });
  });

  await test.step("Гость2: регистрируется и тоже открывает окно бронирования на тот же слот", async () => {
    await guest2Page.goto("/pomidorqa/auth/register");
    await registerNameInput(guest2Page).fill(guest2.name);
    await registerEmailInput(guest2Page).fill(guest2.email);
    await registerPasswordInput(guest2Page).fill(guest2.password);
    await registerSubmitButton(guest2Page).click();
    await expect(guest2Page).toHaveURL(/\/pomidorqa\/?$/);

    await catalogFilterInput(guest2Page).fill(skillTag);
    await catalogFilterSubmit(guest2Page).click();
    await catalogCard(guest2Page, host.name).click();
    await guest2Page.waitForTimeout(1000);
    await expect(personName(guest2Page)).toHaveText(host.name);

    await expect(async () => {
      const dayChip = bookingDay(guest2Page, slotDate);
      if (!(await dayChip.isVisible().catch(() => false))) {
        await guest2Page.reload();
      }
      await expect(dayChip).toBeVisible();
    }).toPass({ timeout: 10_000 });

    await bookingDay(guest2Page, slotDate).click();
    await guest2Page.waitForSelector('button[data-slot-id]', { timeout: 10000 });
    const timeButton2 = anyTime(guest2Page);
    await expect(timeButton2).toBeVisible({ timeout: 10000 });
    await timeButton2.click();
    await expect(bookingDialog(guest2Page)).toBeVisible({ timeout: 10000 });
  });

  await test.step("Гость: подтверждает бронирование первым — успех", async () => {
    await bookingConfirmButton(guestPage).click();
    const success = bookingSuccess(guestPage);
    const error = bookingError(guestPage);
    await expect(success.or(error)).toBeVisible({ timeout: 15000 });
    if (await error.isVisible().catch(() => false)) {
      throw new Error(`Бронирование не удалось: ${await error.textContent()}`);
    }
  });

  await test.step("Гость2: пытается забронировать тот же слот вторым — видит ошибку", async () => {
    await bookingConfirmButton(guest2Page).click();
    const success2 = bookingSuccess(guest2Page);
    const error2 = bookingError(guest2Page);
    await expect(success2.or(error2)).toBeVisible({ timeout: 15000 });
    if (await success2.isVisible().catch(() => false)) {
      throw new Error("Слот должен был быть занят, но бронирование прошло успешно");
    }
    await expect(error2).toBeVisible();
  });

  await test.step("Гость: видит бронирование в «Мои встречи»", async () => {
    await expect(async () => {
      await guestPage.goto("/pomidorqa/bookings");
      await expect(upcomingSection(guestPage)).toBeVisible({ timeout: 5000 });
      await expect(upcomingSection(guestPage).getByText(host.name)).toBeVisible({ timeout: 5000 });
    }).toPass({ timeout: 10000 });
  });

  await test.step("Хост: видит бронирование в «Мои встречи»", async () => {
    await expect(async () => {
      await hostPage.goto("/pomidorqa/bookings");
      await expect(upcomingSection(hostPage)).toBeVisible({ timeout: 5000 });
      await expect(upcomingSection(hostPage).getByText(guest.name)).toBeVisible({ timeout: 5000 });
    }).toPass({ timeout: 10000 });
  });

  await hostContext.close();
  await guestContext.close();
  await guest2Context.close();
});
