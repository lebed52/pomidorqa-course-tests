import { test, expect, type Page } from "@playwright/test";

// E2E-уровень пирамиды: реальный браузер на живом стенде aiqa.su/pomidorqa.
// После ДЗ Урока 4: guest2 открывает тот же слот и должен увидеть ошибку.
// POMIDORQA_BASE_URL=http://localhost:3000 npx playwright test --project=e2e tests/e2e/booking-flow.spec.ts

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

// --- Фабрики локаторов (Page Object Helpers) ---

const getRegisterNameInput = (page: Page) => page.locator("#pomidorqa-register-name");
const getRegisterEmailInput = (page: Page) => page.locator("#pomidorqa-register-email");
const getRegisterPasswordInput = (page: Page) => page.locator("#pomidorqa-register-password");
const getRegisterSubmitButton = (page: Page) => page.getByRole("button", { name: "Зарегистрироваться" });

const getSkillInput = (page: Page) => page.getByRole("textbox", { name: "Навык" });
const getSearchSkillButton = (page: Page) => page.getByRole("button", { name: "Найти" });
const getAddSkillButton = (page: Page) => page.getByRole("button", { name: "Добавить" });
const getSkillTypeSelect = (page: Page) => page.locator("#pomidorqa-profile-skill-type");
const getSkillTagLocator = (page: Page, tag: string) => page.locator(`[data-skill-tag="${tag}"]`);

const getPersonCard = (page: Page, personName: string) =>
  page.getByTestId("person-card").filter({ hasText: personName });
const getPersonHeading = (page: Page, personName: string) =>
  page.getByRole("heading", { name: personName });

const getDayChip = (page: Page) =>
  page.getByRole("group", { name: "Дни со слотами" }).getByRole("button");
const getTimeChip = (page: Page) =>
  page.getByRole("group", { name: "Время слотов" }).getByRole("button");

const getAddSlotDateInput = (page: Page) => page.getByTestId("AddSlotForm-date");
const getAddSlotTimeInput = (page: Page) => page.getByTestId("AddSlotForm-time");
const getAddSlotSubmitButton = (page: Page) => page.getByTestId("AddSlotForm-submit");
const getSlotStatusLocator = (page: Page, status: string) => page.locator(`[data-slot-status="${status}"]`);

const getBookingDialog = (page: Page) => page.getByRole("dialog");
const getConfirmBookingButton = (page: Page) => getBookingDialog(page).getByRole("button", { name: "Подтвердить" });

const getBookingSuccessStatus = (page: Page) => getBookingDialog(page).getByRole("status");
const getBookingErrorAlert = (page: Page) => getBookingDialog(page).getByRole("alert");

const getUpcomingBookingCard = (page: Page, name: string) =>
  page
    .getByTestId("upcoming-meetings")
    .locator("[data-booking-id]")
    .filter({ hasText: name })
    .first();

// --- Вспомогательные функции ---

async function registerUser(page: Page, user: TestUser) {
  await page.goto("/pomidorqa/auth/register");
  await getRegisterNameInput(page).fill(user.name);
  await getRegisterEmailInput(page).fill(user.email);
  await getRegisterPasswordInput(page).fill(user.password);
  await getRegisterSubmitButton(page).click();
  await expect(page).toHaveURL(/\/pomidorqa\/?$/);
}

// --- Тест ---

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

  await test.step("Хост: добавляет навык «могу помочь» в профиле", async () => {
    await hostPage.goto("/pomidorqa/profile");
    await getSkillInput(hostPage).fill(skillTag);
    await getSkillTypeSelect(hostPage).selectOption("can_help");
    await getAddSkillButton(hostPage).click();
    await expect(getSkillTagLocator(hostPage, skillTag)).toContainText(skillTag);
  });

  await test.step("Хост: добавляет свободный слот на завтра", async () => {
    await hostPage.goto("/pomidorqa/profile/slots");
    const tomorrow = new Date(Date.now() + 24 * 60 * 60 * 1000);
    const date = tomorrow.toISOString().slice(0, 10);
    await getAddSlotDateInput(hostPage).fill(date);
    await getAddSlotTimeInput(hostPage).fill("12:00");
    await getAddSlotSubmitButton(hostPage).click();
    await expect(getSlotStatusLocator(hostPage, "free")).toBeVisible();
  });

  await test.step("Гость: регистрируется отдельным аккаунтом", async () => {
    await registerUser(guestPage, guest);
  });

  await test.step("Гость: ищет хоста в каталоге по навыку", async () => {
    await getSkillInput(guestPage).fill(skillTag);
    await getSearchSkillButton(guestPage).click();
    await expect(getPersonCard(guestPage, host.name)).toBeVisible();
  });

  await test.step("Гость: открывает карточку хоста", async () => {
    await getPersonCard(guestPage, host.name).click();
    await expect(getPersonHeading(guestPage, host.name)).toHaveText(host.name);
  });

  await test.step("Гость: кликает по дню и времени в календаре слотов", async () => {
    await expect(async () => {
      const dayChip = getDayChip(guestPage);
      if (!(await dayChip.isVisible().catch(() => false))) {
        await guestPage.reload();
      }
      await expect(dayChip).toBeVisible();
    }).toPass({ timeout: 10_000 });

    await getDayChip(guestPage).first().click();
    await getTimeChip(guestPage).first().click();
    await expect(getBookingDialog(guestPage)).toBeVisible();
  });

  // Важно для разбора ДЗ 4: модалку guest2 открываем ДО confirm у guest.
  // Пока слот в UI ещё свободен — оба «человек открыл и отошёл».
  await test.step("Гость2: регистрируется и тоже открывает окно бронирования на тот же слот", async () => {
    await registerUser(guest2Page, guest2);
    await getSkillInput(guest2Page).fill(skillTag);
    await getSearchSkillButton(guest2Page).click();
    await getPersonCard(guest2Page, host.name).click();
    await expect(getPersonHeading(guest2Page, host.name)).toHaveText(host.name);

    await expect(async () => {
      const dayChip = getDayChip(guest2Page);
      if (!(await dayChip.isVisible().catch(() => false))) {
        await guest2Page.reload();
      }
      await expect(dayChip).toBeVisible();
    }).toPass({ timeout: 10_000 });

    await getDayChip(guest2Page).first().click();
    await getTimeChip(guest2Page).first().click();
    await expect(getBookingDialog(guest2Page)).toBeVisible();
  });

  await test.step("Гость: подтверждает бронирование первым — успех", async () => {
    await getConfirmBookingButton(guestPage).click();

    const success = getBookingSuccessStatus(guestPage);
    const error = getBookingErrorAlert(guestPage);
    await expect(success.or(error)).toBeVisible({ timeout: 15_000 });

    if (await error.isVisible().catch(() => false)) {
      throw new Error("Первый гость должен был успешно забронировать слот, но получил ошибку");
    }
    await expect(success).toBeVisible();
  });

  await test.step("Гость2: пытается забронировать тот же слот вторым — видит ошибку", async () => {
    await getConfirmBookingButton(guest2Page).click();

    const success = getBookingSuccessStatus(guest2Page);
    const error = getBookingErrorAlert(guest2Page);
    await expect(success.or(error)).toBeVisible({ timeout: 15_000 });

    // Полярность наоборот относительно первого гостя: ошибка — ожидаемый результат
    if (await success.isVisible().catch(() => false)) {
      throw new Error("Слот должен был быть занят, но бронирование прошло успешно");
    }
    await expect(error).toBeVisible();
  });

  await test.step("Гость: видит бронирование в разделе «Мои встречи»", async () => {
    await expect(async () => {
      await guestPage.goto("/pomidorqa/bookings");
      await expect(getUpcomingBookingCard(guestPage, host.name)).toBeVisible();
    }).toPass({ timeout: 10_000 });
  });

  await test.step("Хост: тоже видит это бронирование в своих «Мои встречи»", async () => {
    await expect(async () => {
      await hostPage.goto("/pomidorqa/bookings");
      await expect(getUpcomingBookingCard(hostPage, guest.name)).toBeVisible();
    }).toPass({ timeout: 10_000 });
  });

  await hostContext.close();
  await guestContext.close();
  await guest2Context.close();
});