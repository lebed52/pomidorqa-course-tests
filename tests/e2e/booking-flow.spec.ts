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

function authLocators(page: Page) {
  return {
    nameInput: page.getByLabel("Имя"),
    emailInput: page.getByLabel("Email"),
    passwordInput: page.getByLabel("Пароль"),
    submitButton: page.getByRole("button", { name: "Зарегистрироваться" }),
  };
}

function profileLocators(page: Page) {
  return {
    skillInput: page.getByPlaceholder(/Playwright/),
    skillTypeSelect: page.getByLabel("Тип"),
    addSkillSubmit: page.getByRole("button", { name: "Добавить" }),
    canHelpSkills: page.getByTestId("can-help-skills"),
  };
}

function slotsLocators(page: Page) {
  return {
    dateInput: page.getByLabel("Дата"),
    timeInput: page.getByLabel("Время начала"),
    addSubmit: page.getByRole("button", { name: "Добавить слот" }),
    firstSlotCard: page.locator('[data-slot-status="free"]').first(),
  };
}

function catalogLocators(page: Page) {
  return {
    skillFilterInput: page.locator("#pomidorqa-catalog-skill-filter"),
    findButton: page.locator("xpath=//button[normalize-space()='Найти']"),
    hostCard: (hostName: string) =>
      page.getByTestId("person-card").filter({ hasText: hostName }),
  };
}

function personLocators(page: Page) {
  return {
    personName: (hostName: string) => page.getByRole("heading", { name: hostName }),
  };
}

function bookingCalendarLocators(page: Page) {
  return {
    dayChip: page.locator("[data-date]").first(),
    freeTimeSlot: page.locator("[data-slot-id]").first(),
    modalTitle: page.getByText("Подтвердить бронирование?"),
    confirmButton: page.getByRole("button", { name: "Подтвердить" }),
    closeButton: page.getByRole("button", { name: "Закрыть" }),
    bookedMessage: page.getByText("Забронировано"),
    slotTakenMessage: page.getByText("Этот слот только что забронировали"),
  };
}

function bookingsLocators(page: Page) {
  return {
    upcomingSection: page.getByTestId("upcoming-meetings"),
  };
}

async function registerUser(page: Page, user: TestUser) {
  await page.goto("/pomidorqa/auth/register");
  const auth = authLocators(page);
  await auth.nameInput.fill(user.name);
  await auth.emailInput.fill(user.email);
  await auth.passwordInput.fill(user.password);
  await auth.submitButton.click();
  await expect(page).toHaveURL(/\/pomidorqa\/?$/);
}

async function searchHostInCatalog(page: Page, skillTag: string, hostName: string) {
  const catalog = catalogLocators(page);
  await catalog.skillFilterInput.fill(skillTag);
  await catalog.findButton.click();
  await expect(catalog.hostCard(hostName)).toBeVisible();
}

async function openHostBookingSlot(page: Page, skillTag: string, hostName: string) {
  await searchHostInCatalog(page, skillTag, hostName);
  await catalogLocators(page).hostCard(hostName).click();
  await expect(personLocators(page).personName(hostName)).toBeVisible();

  const calendar = bookingCalendarLocators(page);
  await expect(async () => {
    if (!(await calendar.dayChip.isVisible().catch(() => false))) {
      await page.reload();
    }
    await expect(calendar.dayChip).toBeVisible();
  }).toPass({ timeout: 10_000 });

  await calendar.dayChip.click();
  await expect(async () => {
    await calendar.freeTimeSlot.click();
    await expect(calendar.modalTitle).toBeVisible({ timeout: 3_000 });
  }).toPass({ timeout: 20_000 });
}

test("основной путь + гонка за слот: регистрация → навык → слот → поиск в каталоге → бронирование → «Мои встречи» у обоих → второй гость видит ошибку", async ({
  browser,
}) => {
  test.setTimeout(120_000);

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
    const profile = profileLocators(hostPage);
    await profile.skillInput.fill(skillTag);
    await profile.skillTypeSelect.selectOption("can_help");
    await profile.addSkillSubmit.click();
    await expect(profile.canHelpSkills).toContainText(skillTag);
  });

  await test.step("Хост: добавляет свободный слот на завтра", async () => {
    await hostPage.goto("/pomidorqa/profile/slots");
    const slots = slotsLocators(hostPage);
    const tomorrow = new Date(Date.now() + 24 * 60 * 60 * 1000);
    const date = tomorrow.toISOString().slice(0, 10);
    await slots.dateInput.fill(date);
    await slots.timeInput.fill("12:00");
    await slots.addSubmit.click();
    await expect(slots.firstSlotCard).toBeVisible();
  });

  await test.step("Гость: регистрируется отдельным аккаунтом", async () => {
    await registerUser(guestPage, guest);
  });

  await test.step("Гость: ищет хоста в каталоге по навыку (сценарий 9)", async () => {
    await searchHostInCatalog(guestPage, skillTag, host.name);
  });

  await test.step("Гость: открывает карточку хоста и слот в календаре", async () => {
    await openHostBookingSlot(guestPage, skillTag, host.name);
  });

  // Важно для разбора ДЗ 4: модалку guest2 открываем ДО confirm у guest.
  // Пока слот в UI ещё свободен — оба «человек открыл и отошёл».
  await test.step("Гость2: регистрируется и тоже открывает окно бронирования на тот же слот", async () => {
    await registerUser(guest2Page, guest2);
    await openHostBookingSlot(guest2Page, skillTag, host.name);
  });

  await test.step("Гость: подтверждает бронирование первым — успех", async () => {
    const modal = bookingCalendarLocators(guestPage);
    await modal.confirmButton.click();
    await expect(modal.closeButton).toBeVisible({ timeout: 15_000 });
    await expect(modal.bookedMessage).toBeVisible();
  });

  await test.step("Гость2: пытается забронировать тот же слот вторым — видит ошибку", async () => {
    const modal2 = bookingCalendarLocators(guest2Page);
    await modal2.confirmButton.click();
    await expect(modal2.slotTakenMessage).toBeVisible({ timeout: 15_000 });
    await expect(modal2.bookedMessage).toBeHidden();
  });

  await test.step("Гость: видит бронирование в разделе «Мои встречи»", async () => {
    await expect(async () => {
      await guestPage.goto("/pomidorqa/bookings");
      await expect(bookingsLocators(guestPage).upcomingSection).toContainText(host.name);
    }).toPass({ timeout: 10_000 });
  });

  await test.step("Хост: тоже видит это бронирование в своих «Мои встречи»", async () => {
    await expect(async () => {
      await hostPage.goto("/pomidorqa/bookings");
      await expect(bookingsLocators(hostPage).upcomingSection).toContainText(guest.name);
    }).toPass({ timeout: 10_000 });
  });

  await hostContext.close();
  await guestContext.close();
  await guest2Context.close();
});