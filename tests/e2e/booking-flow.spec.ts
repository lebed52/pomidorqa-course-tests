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

//локаторы
const profileSkillInput = (page: Page) => page.locator('#pomidorqa-profile-skill-input');
const profileSkillType = (page: Page) => page.locator('#pomidorqa-profile-skill-type');
const profileAddSkill = (page: Page) => page.getByRole('button', { name: 'Добавить' });
const profileCanHelp = (page: Page) => page.getByTestId('can-help-skills');

const slotsDateInput = (page: Page) => page.locator('#pomidorqa-slots-date');
const slotsTimeInput = (page: Page) => page.locator('#pomidorqa-slots-time');
const slotsAddSubmit = (page: Page) => page.getByRole('button', { name: 'Добавить слот' });
const slotsCard = (page: Page) => page.getByRole('button', { name: 'Удалить' });

const catalogFilterInput = (page: Page) => page.locator('#pomidorqa-catalog-skill-filter');
const catalogFilterSubmit = (page: Page) => page.getByRole('button', { name: 'Найти' });
const catalogPersonCard = (page: Page) => page.getByTestId('person-card');

const personName = (page: Page) => page.getByRole("heading", { level: 1 });

const bookingCalendarDay = (page: Page) => page.getByRole('group', { name: 'Дни со слотами' }).getByRole("button");
const bookingCalendarTime = (page: Page) => page.getByRole('group', { name: 'Время слотов' }).getByRole("button");
const bookingConfirmModal = (page: Page) => page.getByRole('button', { name: 'Подтвердить' });

const bookingConfirmModalSuccess = (page: Page) => page.getByRole('status').filter({ hasText: 'Забронировано' });
const bookingConfirmModalError = (page: Page) => page.getByRole('alert').filter({ hasText: 'Этот слот' });

const bookingsUpcomingSection = (page: Page) => page.getByTestId('upcoming-meetings');

async function registerUser(page: Page, user: TestUser) {
  await page.goto("/pomidorqa/auth/register");
  await page.locator('#pomidorqa-register-name').fill(user.name);
  await page.locator('#pomidorqa-register-email').fill(user.email);
  await page.locator('#pomidorqa-register-password').fill(user.password);
  await page.getByRole('button', { name: 'Зарегистрироваться' }).click();
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
    await profileSkillType(hostPage).selectOption("can_help");
    await profileAddSkill(hostPage).click();
    await expect(profileCanHelp(hostPage)).toContainText(skillTag);
  });

  await test.step("Хост: добавляет свободный слот на завтра", async () => {
    await hostPage.goto("/pomidorqa/profile/slots");
    const tomorrow = new Date(Date.now() + 24 * 60 * 60 * 1000);
    const date = tomorrow.toISOString().slice(0, 10);
    await slotsDateInput(hostPage).fill(date);
    await slotsTimeInput(hostPage).fill("12:00");
    await slotsAddSubmit(hostPage).click();
    await expect(slotsCard(hostPage).first()).toBeVisible();
  });

  await test.step("Гость: регистрируется отдельным аккаунтом", async () => {
    await registerUser(guestPage, guest);
  });

  await test.step("Гость: ищет хоста в каталоге по навыку (сценарий 9)", async () => {
    await catalogFilterInput(guestPage).fill(skillTag);
    await catalogFilterSubmit(guestPage).click();
    await expect(
      catalogPersonCard(guestPage).filter({ hasText: host.name })
    ).toBeVisible();
  });

  await test.step("Гость: открывает карточку хоста", async () => {
    await catalogPersonCard(guestPage).filter({ hasText: host.name }).click();
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
    await expect(bookingConfirmModal(guestPage)).toBeVisible();
  });

  // Важно для разбора ДЗ 4: модалку guest2 открываем ДО confirm у guest.
  // Пока слот в UI ещё свободен — оба «человек открыл и отошёл».
  await test.step("Гость2: регистрируется отдельным аккаунтом", async () => {
    await registerUser(guest2Page, guest2);
  });

  await test.step("Гость2: ищет хоста в каталоге по навыку (сценарий 9)", async () => {
    await catalogFilterInput(guest2Page).fill(skillTag);
    await catalogFilterSubmit(guest2Page).click();
    await expect(
      catalogPersonCard(guest2Page).filter({ hasText: host.name })
    ).toBeVisible();
  });

  await test.step("Гость2: открывает карточку хоста", async () => {
    await catalogPersonCard(guest2Page).filter({ hasText: host.name }).click();
    await expect(personName(guest2Page)).toHaveText(host.name);
  });

  await test.step("Гость2: кликает по дню и времени в календаре слотов", async () => {
    await expect(async () => {
      const dayChip = bookingCalendarDay(guest2Page).first();
      if (!(await dayChip.isVisible().catch(() => false))) {
        await guest2Page.reload();
      }
      await expect(dayChip).toBeVisible();
    }).toPass({ timeout: 10_000 });

    await bookingCalendarDay(guest2Page).first().click();
    await bookingCalendarTime(guest2Page).first().click();
    await expect(bookingConfirmModal(guest2Page)).toBeVisible();
  });

  await test.step("Гость: подтверждает бронирование первым — успех", async () => {
    await bookingConfirmModal(guestPage).click();
    const success = bookingConfirmModalSuccess(guestPage);
    const error = bookingConfirmModalError(guestPage);
    await expect(success.or(error)).toBeVisible({ timeout: 15_000 });
    if (await error.isVisible().catch(() => false)) {
      throw new Error(`Бронирование не удалось: ${await error.textContent()}`);
    }
  });

  await test.step("Гость2: пытается забронировать тот же слот вторым — видит ошибку", async () => {
    await bookingConfirmModal(guest2Page).click();
    const success2 = bookingConfirmModalSuccess(guest2Page);
    const error2 = bookingConfirmModalError(guest2Page);
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
      const card = bookingsUpcomingSection(guestPage);
      await expect(card).toContainText(host.name);
    }).toPass({ timeout: 10_000 });
  });

  await test.step("Хост: тоже видит это бронирование в своих «Мои встречи»", async () => {
    await expect(async () => {
      await hostPage.goto("/pomidorqa/bookings");
      const card = bookingsUpcomingSection(hostPage);
      await expect(card).toContainText(guest.name);
    }).toPass({ timeout: 10_000 });
  });

  await hostContext.close();
  await guestContext.close();
  await guest2Context.close();
});