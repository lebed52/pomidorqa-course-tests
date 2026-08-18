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


const registerNameInput = (page: Page) =>
  page.getByRole("textbox", { name: "Имя" });

const registerEmailInput = (page: Page) =>
  page.getByRole("textbox", { name: "Email" });

const registerPasswordInput = (page: Page) =>
  page.getByRole("textbox", { name: "Пароль Не короче 8 символов" });

const registerSubmitButton = (page: Page) =>
  page.getByRole("button", { name: "Зарегистрироваться" });


const profileSkillInput = (page: Page) => page.getByLabel("Навык");

const profileSkillTypeSelect = (page: Page) =>
  page.getByLabel("ТипМогу помочьХочу разобрать");

const profileAddSkillButton = (page: Page) =>
  page.getByRole("button", { name: "Добавить" });

const profileCanHelpSkillsList = (page: Page) =>
  page.getByTestId("can-help-skills");


const slotsDateInput = (page: Page) => page.getByLabel("Дата");
const slotsTimeInput = (page: Page) => page.getByLabel("Время начала");
const slotsAddButton = (page: Page) =>
  page.getByRole("button", { name: "Добавить слот" });
const slotCard = (page: Page) => page.locator("[data-slot-id]").first();


const catalogFilterInput = (page: Page) =>
  page.getByPlaceholder("Playwright, SQL, собеседования...");

const catalogSearchButton = (page: Page) =>
  page.getByRole("button", { name: "Найти" });

const personCardByName = (page: Page, name: string) =>
  page.getByTestId("person-card").filter({ hasText: name });


const personHeading = (page: Page) => page.getByRole("heading", { level: 1 });


const calendarDayChip = (page: Page) => page.locator("[data-date]").first();
const calendarTimeChip = (page: Page) => page.locator("[data-slot-id]").first();
const bookingConfirmDialog = (page: Page) =>
  page.getByRole("dialog", { name: "Подтвердить бронирование?" });


const bookingConfirmButton = (page: Page) =>
  page.getByRole("button", { name: "Подтвердить" });
const bookingSuccessText = (page: Page) =>
  page.getByText(
    "Забронировано! Договоритесь о ссылке на звонок — она в разделе «Мои встречи»",
  );
const bookingErrorText = (page: Page) =>
  page.getByText("Этот слот только что забронировали — выбери другой");


const upcomingMeetingsSection = (page: Page) =>
  page.getByTestId("upcoming-meetings");
const upcomingMeetingByName = (page: Page, name: string) =>
  upcomingMeetingsSection(page).getByText(name);

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
    await profileSkillInput(hostPage).fill(skillTag);
    await profileSkillTypeSelect(hostPage).selectOption("can_help");
    await profileAddSkillButton(hostPage).click();
    await expect(profileCanHelpSkillsList(hostPage)).toContainText(skillTag);
  });

  await test.step("Хост: добавляет свободный слот на завтра", async () => {
    await hostPage.goto("/pomidorqa/profile/slots");
    const tomorrow = new Date(Date.now() + 24 * 60 * 60 * 1000);
    const date = tomorrow.toISOString().slice(0, 10);
    await slotsDateInput(hostPage).fill(date);
    await slotsTimeInput(hostPage).fill("12:00");
    await slotsAddButton(hostPage).click();
    await expect(slotCard(hostPage)).toBeVisible();
  });

  await test.step("Гость: регистрируется отдельным аккаунтом", async () => {
    await registerUser(guestPage, guest);
  });

  await test.step("Гость: ищет хоста в каталоге по навыку (сценарий 9)", async () => {
    await catalogFilterInput(guestPage).fill(skillTag);
    await catalogSearchButton(guestPage).click();
    await expect(personCardByName(guestPage, host.name)).toBeVisible();
  });

  await test.step("Гость: открывает карточку хоста", async () => {
    await personCardByName(guestPage, host.name).click();
    await expect(personHeading(guestPage)).toHaveText(host.name);
  });

  await test.step("Гость: кликает по дню и времени в календаре слотов", async () => {
    await expect(async () => {
      const dayChip = calendarDayChip(guestPage);
      if (!(await dayChip.isVisible().catch(() => false))) {
        await guestPage.reload();
      }
      await expect(dayChip).toBeVisible();
    }).toPass({ timeout: 10_000 });

    await calendarDayChip(guestPage).click();
    await calendarTimeChip(guestPage).click();
    await expect(bookingConfirmDialog(guestPage)).toBeVisible();
  });

  // Важно для разбора ДЗ 4: модалку guest2 открываем ДО confirm у guest.
  // Пока слот в UI ещё свободен — оба «человек открыл и отошёл».
  await test.step("Гость2: регистрируется и тоже открывает окно бронирования на тот же слот", async () => {
    await registerUser(guest2Page, guest2);

    await catalogFilterInput(guest2Page).fill(skillTag);
    await catalogSearchButton(guest2Page).click();
    await personCardByName(guest2Page, host.name).click();
    await expect(personHeading(guest2Page)).toHaveText(host.name);

    await expect(async () => {
      const dayChip = calendarDayChip(guest2Page);
      if (!(await dayChip.isVisible().catch(() => false))) {
        await guest2Page.reload();
      }
      await expect(dayChip).toBeVisible();
    }).toPass({ timeout: 10_000 });

    await calendarDayChip(guest2Page).click();
    await calendarTimeChip(guest2Page).click();
    await expect(bookingConfirmDialog(guest2Page)).toBeVisible();
  });

  await test.step("Гость: подтверждает бронирование первым — успех", async () => {
    await bookingConfirmButton(guestPage).click();
    const success = bookingSuccessText(guestPage);
    const error = bookingErrorText(guestPage);
    await expect(success.or(error)).toBeVisible({ timeout: 15_000 });
    if (await error.isVisible().catch(() => false)) {
      throw new Error(`Бронирование не удалось: ${await error.textContent()}`);
    }
  });

  await test.step("Гость2: пытается забронировать тот же слот вторым — видит ошибку", async () => {
    await bookingConfirmButton(guest2Page).click();

    const success2 = bookingSuccessText(guest2Page);
    const error2 = bookingErrorText(guest2Page);
    await expect(success2.or(error2)).toBeVisible({ timeout: 15_000 });

    // Полярность наоборот относительно гостя 1: ошибка — ожидаемый результат
    if (await success2.isVisible().catch(() => false)) {
      throw new Error(
        "Слот должен был быть занят, но бронирование прошло успешно",
      );
    }
    await expect(error2).toBeVisible();
  });

  await test.step("Гость: видит бронирование в разделе «Мои встречи»", async () => {
    await expect(async () => {
      await guestPage.goto("/pomidorqa/bookings");
      await expect(upcomingMeetingByName(guestPage, host.name)).toHaveText(
        host.name,
      );
    }).toPass({ timeout: 10_000 });
  });

  await test.step("Хост: тоже видит это бронирование в своих «Мои встречи»", async () => {
    await expect(async () => {
      await hostPage.goto("/pomidorqa/bookings");
      await expect(upcomingMeetingByName(hostPage, guest.name)).toHaveText(
        guest.name,
      );
    }).toPass({ timeout: 10_000 });
  });

  await hostContext.close();
  await guestContext.close();
  await guest2Context.close();
});
