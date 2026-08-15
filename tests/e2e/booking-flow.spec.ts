import { test, expect, type Page } from "@playwright/test";

// E2E-уровень пирамиды: реальный браузер на живом стенде aiqa.su/pomidorqa.
// После ДЗ Урока 4: guest2 открывает тот же слот и должен увидеть ошибку.
// host/guest уже через registerUser; регистрация guest2 пока инлайн — это заготовка к ДЗ Урока 5.
//POMIDORQA_BASE_URL=http://localhost:3000 npx playwright test --project=e2e tests/e2e/booking-flow.spec.ts

function locators(page: Page) {
  return {
    registerNameInput: page.getByLabel('Имя'),
    registerEmailInput: page.getByLabel('Email'),
    registerPasswordInput: page.getByLabel('Пароль'),
    registerSubmit: page.getByRole('button',{name:'Зарегистрироваться'}),

    profileAddSkillInput: page.getByPlaceholder('Например: Playwright, SQL, собеседования'),
    profileAddSkillTypeSelect: page.locator('#pomidorqa-profile-skill-type'),
    profileAddSkillSubmit: page.getByRole('button',{name:'Добавить'}),
    profileCanHelpSkills: page.locator('//button[@data-skill-tag]'),

    slotsDateInput: page.locator('#pomidorqa-slots-date'),
    slotsTimeInput: page.locator('#pomidorqa-slots-time'),
    slotsAddSubmit: page.getByRole('button',{name:'Добавить слот'}),
    slotsCard: page.locator('[data-slot-status="free"]'),

    catalogFilterInput: page.getByLabel('Навык'),
    catalogFilterSubmit: page.getByRole('button',{name:'Найти'}),
    catalogCard: page.locator('[data-person-id]'),

    personName: page.getByRole('heading', { level: 1 }),

    calendarDay: page.locator('button[data-date]'),
    calendarTime: page.locator('button[data-slot-id]'),

    bookingConfirmModalDialog: page.getByRole('dialog'),
    bookingConfirmModalSubmit: page.getByRole('button',{name:'Подтвердить'}),
    bookingConfirmModalSuccess: page.getByText('Забронировано!'),
    bookingConfirmModalError: page.getByText('Этот слот только что забронировали'),

    bookingsUpcomingSection: page.locator('[data-testid="upcoming-meetings"]'),
    bookingsCardName: page.locator('[data-booking-id] .font-medium'),
  };
}

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
  const loc = locators(page);
  await page.goto("/pomidorqa/auth/register");
  await loc.registerNameInput.fill(user.name);
  await loc.registerEmailInput.fill(user.email);
  await loc.registerPasswordInput.fill(user.password);
  await loc.registerSubmit.click();
  await expect(page).toHaveURL(/\/pomidorqa\/?$/);
}

test("основной путь + гонка за слот: регистрация → навык → слот → поиск в каталоге → бронирование → «Мои встречи» у обоих → второй гость видит ошибку", async ({
  browser,
}) => {
  test.setTimeout(90_000);
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

  const hostLoc = locators(hostPage);
  const guestLoc = locators(guestPage);
  const guest2Loc = locators(guest2Page);

  await test.step("Хост: регистрируется в PomidorQA", async () => {
    await registerUser(hostPage, host);
  });

  await test.step('Хост: добавляет навык «могу помочь» в профиле', async () => {
    await hostPage.goto("/pomidorqa/profile");
    await hostLoc.profileAddSkillInput.fill(skillTag);
    await hostLoc.profileAddSkillTypeSelect.selectOption("can_help");
    await hostLoc.profileAddSkillSubmit.click();
    await expect(hostLoc.profileCanHelpSkills).toContainText(skillTag);
  });

  await test.step("Хост: добавляет свободный слот на завтра", async () => {
    await hostPage.goto("/pomidorqa/profile/slots");
    const tomorrow = new Date(Date.now() + 24 * 60 * 60 * 1000);
    const date = tomorrow.toISOString().slice(0, 10);
    await hostLoc.slotsDateInput.fill(date);
    await hostLoc.slotsTimeInput.fill("12:00");
    await hostLoc.slotsAddSubmit.click();
    await expect(hostLoc.slotsCard.first()).toBeVisible();
  });

  await test.step("Гость: регистрируется отдельным аккаунтом", async () => {
    await registerUser(guestPage, guest);
  });

  await test.step("Гость: ищет хоста в каталоге по навыку (сценарий 9)", async () => {
    await guestLoc.catalogFilterInput.fill(skillTag);
    await guestLoc.catalogFilterSubmit.click();
    await expect(guestLoc.catalogCard.filter({ hasText: host.name })).toBeVisible();
  });

  await test.step("Гость: открывает карточку хоста", async () => {
    await guestLoc.catalogCard.filter({ hasText: host.name }).click();
    await expect(guestLoc.personName).toHaveText(host.name);
  });

  await test.step("Гость: кликает по дню и времени в календаре слотов", async () => {
    await expect(async () => {
      const dayChip = guestLoc.calendarDay.first();
      if (!(await dayChip.isVisible().catch(() => false))) {
        await guestPage.reload();
      }
      await expect(dayChip).toBeVisible();
    }).toPass({ timeout: 10_000 });

    await guestLoc.calendarDay.first().click();
    await guestLoc.calendarTime.first().click();
    await expect(guestLoc.bookingConfirmModalDialog).toBeVisible();
  });

  // Важно для разбора ДЗ 4: модалку guest2 открываем ДО confirm у guest.
  // Пока слот в UI ещё свободен — оба «человек открыл и отошёл».
  await test.step("Гость2: регистрируется и тоже открывает окно бронирования на тот же слот", async () => {
    await guest2Page.goto("/pomidorqa/auth/register");
    await guest2Loc.registerNameInput.fill(guest2.name);
    await guest2Loc.registerEmailInput.fill(guest2.email);
    await guest2Loc.registerPasswordInput.fill(guest2.password);
    await guest2Loc.registerSubmit.click();
    await expect(guest2Page).toHaveURL(/\/pomidorqa\/?$/);

    await guest2Loc.catalogFilterInput.fill(skillTag);
    await guest2Loc.catalogFilterSubmit.click();
    await guest2Loc.catalogCard.filter({ hasText: host.name }).click();
    await expect(guest2Loc.personName).toHaveText(host.name);

    await expect(async () => {
      const dayChip = guest2Loc.calendarDay.first();
      if (!(await dayChip.isVisible().catch(() => false))) {
        await guest2Page.reload();
      }
      await expect(dayChip).toBeVisible();
    }).toPass({ timeout: 10_000 });

    await guest2Loc.calendarDay.first().click();
    await guest2Loc.calendarTime.first().click();
    await expect(guest2Loc.bookingConfirmModalDialog).toBeVisible();
  });

  await test.step("Гость: подтверждает бронирование первым — успех", async () => {
    await guestLoc.bookingConfirmModalSubmit.click();
    const success = guestLoc.bookingConfirmModalSuccess;
    const error = guestLoc.bookingConfirmModalError;
    await expect(success.or(error)).toBeVisible({ timeout: 15_000 });
    if (await error.isVisible().catch(() => false)) {
      throw new Error(`Бронирование не удалось: ${await error.textContent()}`);
    }
  });

  await test.step("Гость2: пытается забронировать тот же слот вторым — видит ошибку", async () => {
    await guest2Loc.bookingConfirmModalSubmit.click();

    const success2 = guest2Loc.bookingConfirmModalSuccess;
    const error2 = guest2Loc.bookingConfirmModalError;
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
      const card = guestLoc.bookingsUpcomingSection.locator(guestLoc.bookingsCardName);
      await expect(card).toHaveText(host.name);
    }).toPass({ timeout: 10_000 });
  });

  await test.step("Хост: тоже видит это бронирование в своих «Мои встречи»", async () => {
    await expect(async () => {
      await hostPage.goto("/pomidorqa/bookings");
      const card = hostLoc.bookingsUpcomingSection.locator(hostLoc.bookingsCardName);
      await expect(card).toHaveText(guest.name);
    }).toPass({ timeout: 10_000 });
  });

  await hostContext.close();
  await guestContext.close();
  await guest2Context.close();
});
