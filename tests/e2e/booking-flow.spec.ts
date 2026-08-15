import { test, expect, type Page } from "@playwright/test";

// E2E-уровень пирамиды: реальный браузер на живом стенде aiqa.su/pomidorqa.
// После ДЗ Урока 4: guest2 открывает тот же слот и должен увидеть ошибку.
// host/guest уже через registerUser; регистрация guest2 пока инлайн — это заготовка к ДЗ Урока 5.
//POMIDORQA_BASE_URL=http://localhost:3000 npx playwright test --project=e2e tests/e2e/booking-flow.spec.ts

const nameInput = (page: Page) => page.getByLabel("Имя");
const emailInput = (page: Page) => page.getByLabel("Email");
const passwordInput = (page: Page) => page.getByLabel("Пароль");
const registerButton = (page: Page) => page.getByRole('button', {name : "Зарегистрироваться"});

const skillInput = (page: Page) => page.getByPlaceholder(/Playwright, SQL, собеседования/);
const skillType =  (page: Page) => page.locator("#pomidorqa-profile-skill-type");
const addButton =  (page: Page) => page.getByRole('button', { name: 'Добавить' });
const canHelpSkillsSection =  (page: Page) => page.getByTestId("can-help-skills");

const dateInput =  (page: Page) => page.locator("#pomidorqa-slots-date");
const timeInput =  (page: Page) => page.locator("#pomidorqa-slots-time");
const addSlotButton =  (page: Page) => page.getByRole('button', {name : 'Добавить слот'});
const firstFreeSlot = (page : Page) => page.locator("div[data-slot-status='free']").first();

const searchInput = (page: Page) => page.locator("#pomidorqa-catalog-skill-filter");
const searchButton = (page : Page) => page.getByRole('button', { name: 'Найти' });
const personCardByName = (page: Page, name: string) =>
    page.locator("//a[@data-testid='person-card']").filter({ hasText: name });
const heading = (page: Page) => page.locator("h1");

const firstDate = (page: Page) => page.locator("button[data-date]").first();
const firstTime = (page: Page) => page.locator("button[data-slot-id]").first();
const confirmDialog = (page: Page) => page.getByRole('dialog');
const confirmButton = (page: Page) => page.getByText("Подтвердить").nth(1);

const successMessage = (page: Page) => page.getByText("Забронировано! Договоритесь о ссылке на звонок — она в разделе «Мои встречи»");
const errorMessage = (page: Page) => page.getByText("Этот слот только что забронировали — выбери другой");

const meetingCard = (page : Page) => page
    .getByTestId("upcoming-meetings")
    .locator("div[data-booking-id]");

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
  await nameInput(page).fill(user.name);
  await emailInput(page).fill(user.email);
  await passwordInput(page).fill(user.password);
  await registerButton(page).click();
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
    await skillInput(hostPage).fill(skillTag);
    await skillType(hostPage).selectOption("can_help");
    await addButton(hostPage).click();
    await expect(canHelpSkillsSection(hostPage)).toContainText(skillTag);
  });

  await test.step("Хост: добавляет свободный слот на завтра", async () => {
    await hostPage.goto("/pomidorqa/profile/slots");
    const tomorrow = new Date(Date.now() + 24 * 60 * 60 * 1000);
    const date = tomorrow.toISOString().slice(0, 10);
    await dateInput(hostPage).fill(date);
    await timeInput(hostPage).fill("12:00");
    await addSlotButton(hostPage).click();
    await expect(firstFreeSlot(hostPage)).toBeVisible();
  });

  await test.step("Гость: регистрируется отдельным аккаунтом", async () => {
    await registerUser(guestPage, guest);
  });

  await test.step("Гость: ищет хоста в каталоге по навыку (сценарий 9)", async () => {
    await searchInput(guestPage).fill(skillTag);
    await searchButton(guestPage).click();
    await expect(personCardByName(guestPage, host.name)).toBeVisible();
  });

  await test.step("Гость: открывает карточку хоста", async () => {
    await personCardByName(guestPage, host.name).click();
    await expect(heading(guestPage)).toHaveText(host.name);
  });

  await test.step("Гость: кликает по дню и времени в календаре слотов", async () => {
    await expect(async () => {
      const dayChip = firstDate(guestPage);
      if (!(await dayChip.isVisible().catch(() => false))) {
        await guestPage.reload();
      }
      await expect(dayChip).toBeVisible();
    }).toPass({ timeout: 10_000 });

    await firstDate(guestPage).click();
    await firstTime(guestPage).click();
    await expect(confirmDialog(guestPage)).toBeVisible();
  });

  // Важно для разбора ДЗ 4: модалку guest2 открываем ДО confirm у guest.
  // Пока слот в UI ещё свободен — оба «человек открыл и отошёл».
  await test.step("Гость2: регистрируется и тоже открывает окно бронирования на тот же слот", async () => {
    await guest2Page.goto("/pomidorqa/auth/register");
    await nameInput(guest2Page).fill(guest2.name);
    await emailInput(guest2Page).fill(guest2.email);
    await passwordInput(guest2Page).fill(guest2.password);
    await registerButton(guest2Page).click();
    await expect(guest2Page).toHaveURL(/\/pomidorqa\/?$/);

    await searchInput(guest2Page).fill(skillTag);
    await searchButton(guest2Page).click();
    await personCardByName(guest2Page, host.name).click();
    await expect(heading(guest2Page)).toHaveText(host.name);

    await expect(async () => {
      const dayChip = firstDate(guest2Page).first();
      if (!(await dayChip.isVisible().catch(() => false))) {
        await guest2Page.reload();
      }
      await expect(dayChip).toBeVisible();
    }).toPass({ timeout: 10_000 });

    await firstDate(guest2Page).click();
    await firstTime(guest2Page).click();
    await expect(confirmDialog(guest2Page)).toBeVisible();
  });

  await test.step("Гость: подтверждает бронирование первым — успех", async () => {
    await confirmButton(guestPage).click();
    const success = successMessage(guestPage);
    const error = errorMessage(guestPage);
    await expect(success.or(error)).toBeVisible({ timeout: 15_000 });
    if (await error.isVisible().catch(() => false)) {
      throw new Error(`Бронирование не удалось: ${await error.textContent()}`);
    }
  });

  await test.step("Гость2: пытается забронировать тот же слот вторым — видит ошибку", async () => {
    await confirmButton(guest2Page).click();

    const success2 = successMessage(guest2Page);
    const error2 = errorMessage(guest2Page);
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
      const card = meetingCard(guestPage);
      await expect(card).toContainText(host.name);
    }).toPass({ timeout: 10_000 });
  });

  await test.step("Хост: тоже видит это бронирование в своих «Мои встречи»", async () => {
    await expect(async () => {
      await hostPage.goto("/pomidorqa/bookings");
      const card = meetingCard(hostPage);
      await expect(card).toContainText(guest.name);
    }).toPass({ timeout: 10_000 });
  });

  await hostContext.close();
  await guestContext.close();
  await guest2Context.close();
});
