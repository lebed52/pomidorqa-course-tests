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

function locForRegisterName(page: Page) {
    return page.locator('#pomidorqa-register-name');
}

function locForRegisterEmail(page: Page) {
    return page.locator('#pomidorqa-register-email');
}

function locForRegisterPassword(page: Page) {
    return page.locator('#pomidorqa-register-password');
}

function forButtonSubmitRegister(page: Page) {
    return page.getByRole('button', { name: 'Зарегистрироваться' });
}

function forAddSkillInput(page: Page) {
    return page.locator('#pomidorqa-profile-skill-input');
}

function forAddSkillTypeSelect(page: Page) {
    return page.locator('#pomidorqa-profile-skill-type');
}

function forButtonSubmitAddSkill(page: Page) {
    return page.getByRole('button', { name: 'Добавить' });
}

function forCanHelpSkills(page: Page) {
    return page.getByTestId('can-help-skills');
}

const forInputSlotsDate = (page: Page) => page.getByLabel('Дата');
const forInputSlotsTime = (page: Page) => page.locator('[type="time"]');
const forSubmitSlotsAdd = (page: Page) => page.getByRole('button', { name: /Добавить/i });
const forCheckDataSlotStatus = (page: Page) => page.locator('[data-slot-status="free"]').first();

const forInputCatalogFilter = (page: Page) => page.getByPlaceholder(/Playwright/i);
const forSubmitCatalogFilter = (page: Page) => page.locator('form').filter({ has: page.getByLabel('Навык') } ).locator('button[type="submit"]');
const forCatalogCard = (page: Page) => page.getByTestId("person-card");
const forPersonName = (page: Page) => page.locator('div').filter({ hasText: /Может помочь с/i }).locator('h1')
const forBookingFirstCalendarDay = (page: Page) => page.locator('//div[@aria-label="Дни со слотами"]//button').first();
const forBookingFirstCalendarTime = (page: Page) => page.locator('//div[@aria-label="Время слотов"]//button').first();
const forBookingConfirmModalDialog = (page: Page) => page.getByRole('dialog').filter({ has: page.getByText('Подтвердить') });
const forConfirmBookingInModal = (page: Page) => page.getByRole('button', { name: 'Подтвердить' });
const forSuccessBookingConfirmModal = (page: Page) => page.getByRole('dialog').filter({ has: page.getByText(/Забронировано/i) });
const forErrorBookingConfirmModal = (page: Page) => page.getByRole('dialog').filter({ has: page.getByRole('alert') });

const bookingsCardFromUpcomingSection = (page: Page) => page.getByTestId("upcoming-meetings").locator('//div[@data-booking-id]//p').first();

async function registerUser(page: Page, user: TestUser) {
  await page.goto("/pomidorqa/auth/register");
  await locForRegisterName(page).fill(user.name);
  await locForRegisterEmail(page).fill(user.email);
  await locForRegisterPassword(page).fill(user.password);
  await forButtonSubmitRegister(page).click();
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
    await forAddSkillInput(hostPage).fill(skillTag);
    await forAddSkillTypeSelect(hostPage).selectOption("can_help");
    await forButtonSubmitAddSkill(hostPage).click();
    await expect(forCanHelpSkills(hostPage)).toContainText(skillTag);
  });

  await test.step("Хост: добавляет свободный слот на завтра", async () => {
    await hostPage.goto("/pomidorqa/profile/slots");
    const tomorrow = new Date(Date.now() + 24 * 60 * 60 * 1000);
    const date = tomorrow.toISOString().slice(0, 10);
    await forInputSlotsDate(hostPage).fill(date);
    await forInputSlotsTime(hostPage).fill("12:00");
    await forSubmitSlotsAdd(hostPage).click();
    await expect(forCheckDataSlotStatus(hostPage)).toBeVisible();
  });

  await test.step("Гость: регистрируется отдельным аккаунтом", async () => {
    await registerUser(guestPage, guest);
  });

  await test.step("Гость: ищет хоста в каталоге по навыку (сценарий 9)", async () => {
    await forInputCatalogFilter(guestPage).fill(skillTag);
    await forSubmitCatalogFilter(guestPage).click();
    await expect(
      forCatalogCard(guestPage).filter({ hasText: host.name })
    ).toBeVisible();
  });

  await test.step("Гость: открывает карточку хоста", async () => {
    await forCatalogCard(guestPage).filter({ hasText: host.name }).click();
    await expect(forPersonName(guestPage)).toHaveText(host.name);
  });

  await test.step("Гость: кликает по дню и времени в календаре слотов", async () => {
    await expect(async () => {
      const dayChip = forBookingFirstCalendarDay(guestPage);
      if (!(await dayChip.isVisible().catch(() => false))) {
        await guestPage.reload();
      }
      await expect(dayChip).toBeVisible();
    }).toPass({ timeout: 10_000 });

    await forBookingFirstCalendarDay(guestPage).click();
    await forBookingFirstCalendarTime(guestPage).click();
    await expect(forBookingConfirmModalDialog(guestPage)).toBeVisible();
  });

  // Важно для разбора ДЗ 4: модалку guest2 открываем ДО confirm у guest.
  // Пока слот в UI ещё свободен — оба «человек открыл и отошёл».
  await test.step("Гость2: регистрируется и тоже открывает окно бронирования на тот же слот", async () => {
    await guest2Page.goto("/pomidorqa/auth/register");
    await locForRegisterName(guest2Page).fill(guest2.name);
    await locForRegisterEmail(guest2Page).fill(guest2.email);
    await locForRegisterPassword(guest2Page).fill(guest2.password);
    await forButtonSubmitRegister(guest2Page).click();
    await expect(guest2Page).toHaveURL(/\/pomidorqa\/?$/);

    await forInputCatalogFilter(guest2Page).fill(skillTag);
    await forSubmitCatalogFilter(guest2Page).click();
    await forCatalogCard(guest2Page).filter({ hasText: host.name }).click();
    await expect(forPersonName(guest2Page)).toHaveText(host.name);

    await expect(async () => {
      const dayChip = forBookingFirstCalendarDay(guest2Page);
      if (!(await dayChip.isVisible().catch(() => false))) {
        await guest2Page.reload();
      }
      await expect(dayChip).toBeVisible();
    }).toPass({ timeout: 10_000 });

    await forBookingFirstCalendarDay(guest2Page).click();
    await forBookingFirstCalendarTime(guest2Page).click();
    await expect(forBookingConfirmModalDialog(guest2Page)).toBeVisible();
  });

  await test.step("Гость: подтверждает бронирование первым — успех", async () => {
    await forConfirmBookingInModal(guestPage).click();
    const success = forSuccessBookingConfirmModal(guestPage);
    const error = forErrorBookingConfirmModal(guestPage);
    await expect(success.or(error)).toBeVisible({ timeout: 15_000 });
    if (await error.isVisible().catch(() => false)) {
      throw new Error(`Бронирование не удалось: ${await error.textContent()}`);
    }
  });

  await test.step("Гость2: пытается забронировать тот же слот вторым — видит ошибку", async () => {
    await forConfirmBookingInModal(guest2Page).click();

    const success2 = forSuccessBookingConfirmModal(guest2Page);
    const error2 = forErrorBookingConfirmModal(guest2Page);
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
      const card = bookingsCardFromUpcomingSection(guestPage);
      await expect(card).toHaveText(host.name);
    }).toPass({ timeout: 10_000 });
  });

  await test.step("Хост: тоже видит это бронирование в своих «Мои встречи»", async () => {
    await expect(async () => {
      await hostPage.goto("/pomidorqa/bookings");
      const card = bookingsCardFromUpcomingSection(hostPage);
      await expect(card).toHaveText(guest.name);
    }).toPass({ timeout: 10_000 });
  });

  await hostContext.close();
  await guestContext.close();
  await guest2Context.close();
});
