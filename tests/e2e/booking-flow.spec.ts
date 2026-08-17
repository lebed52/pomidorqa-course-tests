import { test, expect, type Page } from "@playwright/test";

// E2E-уровень пирамиды: реальный браузер на живом стенде aiqa.su/pomidorqa.
// После ДЗ Урока 4: guest2 открывает тот же слот и должен увидеть ошибку.
// После ДЗ Урока 5: host/guest/guest2 регистрация через registerUser.
// После ДЗ Урока 6: локаторы вынесены вверх файла, в шагах — только действия над ними.
//POMIDORQA_BASE_URL=http://localhost:3000 npx playwright test --project=e2e tests/e2e/booking-flow.spec.ts

//Локаторы: Регистрация
const nameInput = (page: Page) => page.getByLabel('Имя');
const emailInput = (page: Page) => page.getByLabel('Email');
const passwordInput = (page: Page) => page.getByLabel('Пароль');
const registerButton = (page: Page) => page.getByRole('button', { name: 'Зарегистрироваться' });

//Локаторы: Профиль -> навык
const skillInput = (page: Page) => page.locator('//input[@name="skillTag"]');
const skillTypeSelect = (page: Page) => page.locator('//select[@name="type"]');
const addSkillButton = (page: Page) => page.locator('//button[text()="Добавить"]');
const canHelpSkills = (page: Page) => page.locator('//div[@data-testid="can-help-skills"]');

//Локаторы: Мои слоты
const slotDateInput = (page: Page) => page.getByLabel('Дата');
const slotTimeInput = (page: Page) => page.getByLabel('Время начала');
const addSlotButton = (page: Page) => page.getByRole('button', {name: 'Добавить'});
const slotsCard = (page: Page) => page.locator('//div[@data-slot-status="free"]');

//Локаторы: каталог слотов
const skillFilterInput = (page: Page) => page.locator('#pomidorqa-catalog-skill-filter');
const searchButton = (page: Page) => page.getByRole('button', {name: 'Найти'})
const personCard = (page: Page, name: string) => page.getByTestId('person-card').filter({ hasText: name });

//Локаторы: страница человека -> календарь слотов
const personName = (page: Page, name: string) => page.getByRole('heading', { name });
const dayChip = (page: Page) => page.getByRole('group', { name: 'Дни со слотами' }).getByRole('button').first();
const timeChip = (page: Page) => page.getByRole('group', { name: 'Время слотов' }).getByRole('button').first();

//Локаторы: окно подтверждения бронирования
const confirmDialog = (page: Page) => page.getByRole('dialog', { name: 'Подтвердить бронирование?' });
const confirmButton = (page: Page) => confirmDialog(page).getByRole('button', { name: 'Подтвердить', exact: true });
const bookingSuccess = (page: Page) => page.getByRole('status').filter({ hasText: 'Забронировано' });
const bookingError = (page: Page) => page.getByRole('alert').filter({ hasText: 'забронировали' });

//Локаторы: Мои встречи
//CSS-якорь: секция «Ближайшие» по data-testid, имя собеседника — параграф в карточке брони
const upcomingBookingName = (page: Page) =>
  page.locator('[data-testid="upcoming-meetings"] [data-booking-id] p').first();

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
    await skillTypeSelect(hostPage).selectOption("can_help");
    await addSkillButton(hostPage).click();
    await expect(canHelpSkills(hostPage)).toContainText(skillTag);
  });

  await test.step("Хост: добавляет свободный слот на завтра", async () => {
    await hostPage.goto("/pomidorqa/profile/slots");
    const tomorrow = new Date(Date.now() + 24 * 60 * 60 * 1000);
    const date = tomorrow.toISOString().slice(0, 10);
    await slotDateInput(hostPage).fill(date);
    await slotTimeInput(hostPage).fill("12:00");
    await addSlotButton(hostPage).click();
    await expect(slotsCard(hostPage).first()).toBeVisible();
  });

  await test.step("Гость: регистрируется отдельным аккаунтом", async () => {
    await registerUser(guestPage, guest);
  });

  await test.step("Гость: ищет хоста в каталоге по навыку (сценарий 9)", async () => {
    await skillFilterInput(guestPage).fill(skillTag);
    await searchButton(guestPage).click();
    await expect(personCard(guestPage, host.name)).toBeVisible();
  });

  await test.step("Гость: открывает карточку хоста", async () => {
    await personCard(guestPage, host.name).click();
    await expect(personName(guestPage, host.name)).toBeVisible();
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
    await expect(confirmDialog(guestPage)).toBeVisible();
  });

  // Важно для разбора ДЗ 4: модалку guest2 открываем ДО confirm у guest.
  // Пока слот в UI ещё свободен — оба «человек открыл и отошёл».
  await test.step("Гость2: регистрируется и тоже открывает окно бронирования на тот же слот", async () => {
    await registerUser(guest2Page, guest2);

    await skillFilterInput(guest2Page).fill(skillTag);
    await searchButton(guest2Page).click();
    await personCard(guest2Page, host.name).click();
    await expect(personName(guest2Page, host.name)).toBeVisible();

    await expect(async () => {
      if (!(await dayChip(guest2Page).isVisible().catch(() => false))) {
        await guest2Page.reload();
      }
      await expect(dayChip(guest2Page)).toBeVisible();
    }).toPass({ timeout: 10_000 });

    await dayChip(guest2Page).click();
    await timeChip(guest2Page).click();
    await expect(confirmDialog(guest2Page)).toBeVisible();
  });

  await test.step("Гость: подтверждает бронирование первым — успех", async () => {
    await confirmButton(guestPage).click();
    await expect(bookingSuccess(guestPage).or(bookingError(guestPage))).toBeVisible({ timeout: 15_000 });
    if (await bookingError(guestPage).isVisible().catch(() => false)) {
      throw new Error(`Бронирование не удалось: ${await bookingError(guestPage).textContent()}`);
    }
  });

  await test.step("Гость2: пытается забронировать тот же слот вторым — видит ошибку", async () => {
    await confirmButton(guest2Page).click();

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
      await expect(upcomingBookingName(guestPage)).toHaveText(host.name);
    }).toPass({ timeout: 10_000 });
  });

  await test.step("Хост: тоже видит это бронирование в своих «Мои встречи»", async () => {
    await expect(async () => {
      await hostPage.goto("/pomidorqa/bookings");
      await expect(upcomingBookingName(hostPage)).toHaveText(guest.name);
    }).toPass({ timeout: 10_000 });
  });

  await hostContext.close();
  await guestContext.close();
  await guest2Context.close();
});
