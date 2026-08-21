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

const registerNameInput = (page: Page) => page.getByLabel("Имя");
const registerEmailInput = (page: Page) => page.getByLabel("Email");
const registerPasswordInput = (page: Page) => page.getByLabel("Пароль");
const registerSubmitButton = (page: Page) => page.getByRole("button", { name: "Зарегистрироваться" });

async function registerUser(page: Page, user: TestUser) {
  await page.goto("/pomidorqa/auth/register");
  await registerNameInput(page).fill(user.name);
  await registerEmailInput(page).fill(user.email);
  await registerPasswordInput(page).fill(user.password);
  await registerSubmitButton(page).click();
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
  const insertSkill = (page: Page) => page.getByLabel("Навык");
  const selectSkillType = (page: Page) => page.locator('[name="type"]');
  const submitSkill = (page: Page) => page.getByRole("button", { name: "Добавить" });
  const canHelpSkills = (page: Page) => page.getByTestId("can-help-skills");
  
  const dateInput = (page: Page) => page.locator("#pomidorqa-slots-date");
  const timeInput = (page: Page) => page.getByLabel("Время начала");
  const submitSlot = (page: Page) => page.getByRole("button", { name: "Добавить слот" });
  const freeSlot = (page: Page) => page.locator('[data-slot-status="free"]').first();

  const catalogFilterInput = (page: Page) => page.getByRole("textbox", { name: "Навык" });
  const submitCatalogFilter = (page: Page) => page.getByRole("button", { name: "Найти" });
  const catalogCard = (page: Page) => page.getByTestId("person-card");

  const personName = (page: Page) => page.getByRole("heading", { name: host.name });

  const dayChip = (page: Page) => page.locator("[data-date]").first();
  const timeChip = (page: Page) => page.locator("[data-slot-id]").first();
  const bookingDialog = (page: Page) => page.getByRole("dialog");

  const confirmBooking = (page: Page) => page.getByRole("button", { name: "Подтвердить" });
  const bookingSuccess = (page: Page) => page.getByText(/Забронировано/i);
  const bookingError = (page: Page) => page.getByText(/Этот слот только что забронировали/i);

  
  const guestUpcomingMeetings = (page: Page) => page.getByTestId("upcoming-meetings");
  const hostUpcomingMeetings = (page: Page) => page.getByTestId("upcoming-meetings");


  await test.step("Хост: регистрируется в PomidorQA", async () => {
    await registerUser(hostPage, host);
  });

  await test.step('Хост: добавляет навык «могу помочь» в профиле', async () => {
    await hostPage.goto("/pomidorqa/profile");
    await insertSkill(hostPage).fill(skillTag);
    await selectSkillType(hostPage).selectOption("can_help");
    await submitSkill(hostPage).click();
    await expect(canHelpSkills(hostPage)).toContainText(skillTag);
  });

  await test.step("Хост: добавляет свободный слот на завтра", async () => {
    await hostPage.goto("/pomidorqa/profile/slots");
    const tomorrow = new Date(Date.now() + 24 * 60 * 60 * 1000);
    const date = tomorrow.toISOString().slice(0, 10);
    await dateInput(hostPage).fill(date);
    await timeInput(hostPage).fill("12:00");
    await submitSlot(hostPage).click();
    await expect(freeSlot(hostPage)).toBeVisible();
  });

  await test.step("Гость: регистрируется отдельным аккаунтом", async () => {
    await registerUser(guestPage, guest);
  });

  await test.step("Гость: ищет хоста в каталоге по навыку (сценарий 9)", async () => {
    await catalogFilterInput(guestPage).fill(skillTag);
    await submitCatalogFilter(guestPage).click();
    await expect(catalogCard(guestPage).filter({ hasText: host.name })).toBeVisible();
  });

  await test.step("Гость: открывает карточку хоста", async () => {
    await catalogCard(guestPage).filter({ hasText: host.name }).click();
    await expect(personName(guestPage)).toHaveText(host.name);
  });

  await test.step("Гость: кликает по дню и времени в календаре слотов", async () => {
    await expect(async () => {
      if (!(await dayChip(guestPage).isVisible().catch(() => false))) {
        await guestPage.reload();
      }
      await expect(dayChip(guestPage)).toBeVisible();
    }).toPass({ timeout: 10_000 });

    await dayChip(guestPage).click();
    await timeChip(guestPage).click();
    await expect(bookingDialog(guestPage)).toBeVisible();
  });

  await test.step("Гость2: регистрируется и тоже открывает окно бронирования на тот же слот", async () => {
    await registerUser(guest2Page, guest2);
    await catalogFilterInput(guest2Page).fill(skillTag);
    await submitCatalogFilter(guest2Page).click();
    await catalogCard(guest2Page).filter({ hasText: host.name }).click();
    await expect(personName(guest2Page)).toHaveText(host.name);

    await expect(async () => {
      if (!(await dayChip(guest2Page).isVisible().catch(() => false))) {
        await guest2Page.reload();
      }
      await expect(dayChip(guest2Page)).toBeVisible();
    }).toPass({ timeout: 10_000 });

    await dayChip(guest2Page).click();
    await timeChip(guest2Page).click();
    await expect(bookingDialog(guest2Page)  ).toBeVisible();
  });

  await test.step("Гость: подтверждает бронирование первым — успех", async () => {
    await confirmBooking(guestPage).click();
    await expect(bookingSuccess(guestPage).or(bookingError(guestPage))).toBeVisible({ timeout: 15_000 });
    if (await bookingError(guestPage).isVisible().catch(() => false)) {
      throw new Error(`Бронирование не удалось: ${await bookingError(guestPage).textContent()}`);
    }
  });

  await test.step("Гость2: пытается забронировать тот же слот вторым — видит ошибку", async () => {
    await confirmBooking(guest2Page).click();
    await expect(bookingSuccess(guest2Page).or(bookingError(guest2Page))).toBeVisible({ timeout: 15_000 });

    // Полярность наоборот относительно гостя 1: ошибка — ожидаемый результат
    if (await bookingSuccess(guest2Page).isVisible().catch(() => false)) {
      throw new Error("Слот должен был быть занят, но бронирование прошло успешно");
    }
    await expect(bookingError(guest2Page)).toBeVisible();
  });

  await test.step("Гость: видит бронирование в разделе «Мои встречи»", async () => {
    await expect(async () => {
      await guestPage.goto("/pomidorqa/bookings");
      await expect(guestUpcomingMeetings(guestPage)).toContainText(host.name);
    }).toPass({ timeout: 10_000 });
  });

  await test.step("Хост: тоже видит это бронирование в своих «Мои встречи»", async () => {
    await expect(async () => {
      await hostPage.goto("/pomidorqa/bookings");
      await expect(hostUpcomingMeetings(hostPage)).toContainText(guest.name);
    }).toPass({ timeout: 10_000 });
  });

  await hostContext.close();
  await guestContext.close();
  await guest2Context.close();
});