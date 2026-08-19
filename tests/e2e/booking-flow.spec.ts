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
  await page.getByLabel("Имя").fill(user.name);
  await page.getByLabel("Email").fill(user.email);
  await page.getByLabel("Пароль").fill(user.password);
  await page
    .getByRole("button", { name: "Зарегистрироваться" })
    .click();
  await expect(page).toHaveURL(/\/pomidorqa\/?$/, {

    timeout: 15_000,

  });
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

  //Locators
  const insertSkill = hostPage.getByLabel("Навык");
  const selectSkillType = hostPage.locator('[name="type"]');
  const submitSkill = hostPage.getByRole("button", { name: "Добавить" });
  const canHelpSkills = hostPage.getByTestId("can-help-skills");
  
  const dateInput = hostPage.locator("#pomidorqa-slots-date");
  const timeInput = hostPage.getByLabel("Время начала");
  const submitSlot = hostPage.getByRole("button", { name: "Добавить слот" });
  const freeSlot = hostPage.locator('[data-slot-status="free"]').first();

  const catalogFilterInput = guestPage.getByPlaceholder("Playwright, SQL, собеседования...");
  const submitCatalogFilter = guestPage.getByRole("button", { name: "Найти" });
  const catalogCard = guestPage.getByTestId("person-card");

  const personName = guestPage.getByRole("heading", { name: host.name });

  const dayChip = guestPage.locator("[data-date]").first();
  const timeChip = guestPage.locator("[data-slot-id]").first();
  const bookingDialog = guestPage.getByRole("dialog");

  const catalogFilterInput2 = guest2Page.getByPlaceholder("Playwright, SQL, собеседования...");
  const submitCatalogFilter2 = guest2Page.getByRole("button", { name: "Найти" });
  const catalogCard2 = guest2Page.getByTestId("person-card");
  const personName2 = guest2Page.getByRole("heading", { name: host.name });
  const dayChip2 = guest2Page.locator("[data-date]").first();
  const timeChip2 = guest2Page.locator("[data-slot-id]").first();
  const bookingDialog2 = guest2Page.getByRole("dialog");

  const confirmBooking = guestPage.getByRole("button", { name: "Подтвердить" });
  const bookingSuccess = guestPage.getByText(/Забронировано/i);
  const bookingError = guestPage.getByText(/Бронирование не удалось/i);

  const confirmBooking2 = guest2Page.getByRole("button", { name: "Подтвердить" });
  const bookingSuccess2 = guest2Page.getByText(/Забронировано/i);
  const bookingError2 = guest2Page.getByText(/забронировали/i);

  const guestUpcomingMeetings = guestPage.getByTestId("upcoming-meetings");
  const hostUpcomingMeetings = hostPage.getByTestId("upcoming-meetings");


  await test.step("Хост: регистрируется в PomidorQA", async () => {
    await registerUser(hostPage, host);
  });

  await test.step('Хост: добавляет навык «могу помочь» в профиле', async () => {
    await hostPage.goto("/pomidorqa/profile");
    await insertSkill.fill(skillTag);
    await selectSkillType.selectOption("can_help");
    await submitSkill.click();
    await expect(canHelpSkills).toContainText(skillTag);
  });

  await test.step("Хост: добавляет свободный слот на завтра", async () => {
    await hostPage.goto("/pomidorqa/profile/slots");
    const tomorrow = new Date(Date.now() + 24 * 60 * 60 * 1000);
    const date = tomorrow.toISOString().slice(0, 10);
    await dateInput.fill(date);
    await timeInput.fill("12:00");
    await submitSlot.click();
    await expect(freeSlot).toBeVisible();
  });

  await test.step("Гость: регистрируется отдельным аккаунтом", async () => {
    await registerUser(guestPage, guest);
  });

  await test.step("Гость: ищет хоста в каталоге по навыку (сценарий 9)", async () => {
    await catalogFilterInput.fill(skillTag);
    await submitCatalogFilter.click();
    await expect(catalogCard.filter({ hasText: host.name })).toBeVisible();
  });

  await test.step("Гость: открывает карточку хоста", async () => {
    await catalogCard.filter({ hasText: host.name }).click();
    await expect(personName).toHaveText(host.name);
  });

  await test.step("Гость: кликает по дню и времени в календаре слотов", async () => {
    await expect(async () => {
      if (!(await dayChip.isVisible().catch(() => false))) {
        await guestPage.reload();
      }
      await expect(dayChip).toBeVisible();
    }).toPass({ timeout: 10_000 });

    await dayChip.click();
    await timeChip.click();
    await expect(bookingDialog).toBeVisible();
  });

  // Важно для разбора ДЗ 4: модалку guest2 открываем ДО confirm у guest.
  // Пока слот в UI ещё свободен — оба «человек открыл и отошёл».
  await test.step("Гость2: регистрируется и тоже открывает окно бронирования на тот же слот", async () => {
    await registerUser(guest2Page, guest2);
    await catalogFilterInput2.fill(skillTag);
    await submitCatalogFilter2.click();
    await catalogCard2.filter({ hasText: host.name }).click();
    await expect(personName2).toHaveText(host.name);

    await expect(async () => {
      const dayChip2 = guest2Page.locator("[data-date]").first();
      if (!(await dayChip2.isVisible().catch(() => false))) {
        await guest2Page.reload();
      }
      await expect(dayChip2).toBeVisible();
    }).toPass({ timeout: 10_000 });

    await dayChip2.click();
    await timeChip2.click();
    await expect(bookingDialog2).toBeVisible();
  });

  await test.step("Гость: подтверждает бронирование первым — успех", async () => {
    await confirmBooking.click();
    await expect(bookingSuccess.or(bookingError)).toBeVisible({ timeout: 15_000 });
    if (await bookingError.isVisible().catch(() => false)) {
      throw new Error(`Бронирование не удалось: ${await bookingError.textContent()}`);
    }
  });

  await test.step("Гость2: пытается забронировать тот же слот вторым — видит ошибку", async () => {
    await confirmBooking2.click();
    await expect(bookingSuccess2.or(bookingError2)).toBeVisible({ timeout: 15_000 });

    // Полярность наоборот относительно гостя 1: ошибка — ожидаемый результат
    if (await bookingSuccess2.isVisible().catch(() => false)) {
      throw new Error("Слот должен был быть занят, но бронирование прошло успешно");
    }
    await expect(bookingError2).toBeVisible();
  });

  await test.step("Гость: видит бронирование в разделе «Мои встречи»", async () => {
    await expect(async () => {
      await guestPage.goto("/pomidorqa/bookings");
      await expect(guestUpcomingMeetings).toContainText(host.name);
    }).toPass({ timeout: 10_000 });
  });

  await test.step("Хост: тоже видит это бронирование в своих «Мои встречи»", async () => {
    await expect(async () => {
      await hostPage.goto("/pomidorqa/bookings");
      await expect(hostUpcomingMeetings).toContainText(guest.name);
    }).toPass({ timeout: 10_000 });
  });

  await hostContext.close();
  await guestContext.close();
  await guest2Context.close();
});