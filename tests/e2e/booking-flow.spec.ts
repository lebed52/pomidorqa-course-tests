import { test, expect, type Page } from '@playwright/test';

type TestUser = {
  name: string;
  email: string;
  password: string;
};

function makeUser(role: string, runId: number): TestUser {
  return {
    name: `${role} Автотест`,
    email: `${role}-${runId}@example.com`,
    password: 'testpass123',
  };
}
//Локаторы
const registerNameInput = (page: Page) => page.getByLabel("Имя");
const registerEmailInput = (page: Page) => page.getByLabel("Email");
const registerPasswordInput = (page: Page) => page.getByLabel("Пароль");
const registerSubmitButton = (page: Page) => page.getByRole("button", { name: "Зарегистрироваться" });

const profileSkillInput = (page: Page) => page.locator("#pomidorqa-profile-skill-input");
const profileSkillTypeSelect = (page: Page) => page.locator("#pomidorqa-profile-skill-type");
const profileSkillSubmit = (page: Page) => page.getByRole("button", { name: "Добавить" });
const profileCanHelpSkills = (page: Page) => page.getByTestId("can-help-skills");

const slotsDateInput = (page: Page) => page.locator("#pomidorqa-slots-date");
const slotsTimeInput = (page: Page) => page.locator("#pomidorqa-slots-time");
const slotsAddSubmit = (page: Page) => page.getByRole("button", { name: "Добавить слот" });
const slotsCard = (page: Page) => page.locator("[data-slot-id]");

const catalogFilterInput = (page: Page) => page.locator("#pomidorqa-catalog-skill-filter");
const catalogFilterSubmit = (page: Page) => page.getByRole("button", { name: "Найти" });
const catalogCard = (page: Page) => page.getByTestId("person-card");

const personName = (page: Page) => page.getByRole("heading", { level: 1 });

const bookingCalendarDay = (page: Page) =>
  page.getByRole("group", { name: "Дни со слотами" }).getByRole("button");
const bookingCalendarTime = (page: Page) =>
  page.getByRole("group", { name: "Время слотов" }).getByRole("button");

const bookingConfirmDialog = (page: Page) => page.getByRole("dialog");
const bookingConfirmButton = (page: Page) =>
  page.getByRole("dialog").getByRole("button", { name: "Подтвердить" });
const bookingConfirmSuccess = (page: Page) => page.getByRole("dialog").getByRole("status");
const bookingConfirmError = (page: Page) => page.getByRole("dialog").getByRole("alert");

const bookingsUpcomingSection = (page: Page) => page.getByTestId("upcoming-meetings");
const bookingsCardName = (page: Page) =>
  bookingsUpcomingSection(page).locator("[data-booking-id]").first().locator("p").first();


//Локаторы

const InputName = (page: Page) => page.getByLabel('Имя');
const InputEmail = (page: Page) => page.getByLabel('Email');
const InputPassword = (page: Page) => page.getByLabel('Пароль');
const BtnReg = (page: Page) => page.getByRole('button', { name: 'Зарегистрироваться' });

const InputProfileSkill = (page: Page) => page.locator('#pomidorqa-profile-skill-input');
const SelectSkillType = (page: Page) => page.locator('#pomidorqa-profile-skill-type');
const BtnAdd = (page: Page) => page.getByRole('button', { name: 'Добавить' });
const CanHelpSkill = (page: Page) => page.getByTestId('can-help-skills');

const SlotDate = (page: Page) => page.locator('#pomidorqa-slots-date');
const SlotTime = (page: Page) => page.locator('#pomidorqa-slots-time');
const AddSlot = (page: Page) => page.getByRole('button', { name: 'Добавить' });
const ListSkill = (page: Page) => page.locator('//div[@data-slot-status ="free"]');

const PomidorqaCatalogFilterInput = (page: Page) => page.locator('#pomidorqa-catalog-skill-filter');
const BtnSearch = (page: Page) => page.getByRole('button', { name: 'Найти' });
const PersonCard = (page: Page) => page.locator('[data-testid="person-card"]');
const PersonName = (page: Page) => page.locator('h1');

const BookingCalendarDay = (page: Page) => page.locator('[aria-pressed="true"]');
const BookingCalendarTime = (page: Page) =>
  page.getByRole('group', { name: 'Время слотов' }).getByRole('button');
const BookingConfirmModalDialog = (page: Page) => page.locator('[role="dialog"]');

const BookingConfirmModalConfirm = (page: Page) =>
  page.getByRole('button', { name: 'Подтвердить' });
const BookingConfirmModalSuccess = (page: Page) => page.getByText('Забронировано');
const BookingConfirmModalError = (page: Page) =>
  page.getByText('Этот слот только что забронировали');

const PomidorqaBookingsUpcomingSection = (page: Page) => page.getByTestId('upcoming-meetings');

async function registerUser(page: Page, user: TestUser) {
  await page.goto("/pomidorqa/auth/register");
  await registerNameInput(page).fill(user.name);
  await registerEmailInput(page).fill(user.email);
  await registerPasswordInput(page).fill(user.password);
  await registerSubmitButton(page).click();
  await expect(page).toHaveURL(/\/pomidorqa\/?$/);
}
test('основной путь + гонка за слот: регистрация → навык → слот → поиск в каталоге → бронирование → «Мои встречи» у обоих → второй гость видит ошибку', async ({
  browser,
}) => {
  const runId = Date.now();
  const skillTag = `Playwright-demo-${runId}`;
  const host = makeUser('host', runId);
  const guest = makeUser('guest', runId);
  const guest2 = makeUser('guest2', runId);

  // Три независимых аккаунта = три независимых браузерных контекста
  const hostContext = await browser.newContext();
  const guestContext = await browser.newContext();
  const guest2Context = await browser.newContext();
  const hostPage = await hostContext.newPage();
  const guestPage = await guestContext.newPage();
  const guest2Page = await guest2Context.newPage();

  await test.step('Хост: регистрируется в PomidorQA', async () => {
    await registerUser(hostPage, host);
  });
 
  await test.step('Хост: добавляет навык «могу помочь» в профиле', async () => {
    await hostPage.goto("/pomidorqa/profile");
    await profileSkillInput(hostPage).fill(skillTag);
    await profileSkillTypeSelect(hostPage).selectOption("can_help");
    await profileSkillSubmit(hostPage).click();
    await expect(profileCanHelpSkills(hostPage)).toContainText(skillTag);
  });

  await test.step('Хост: добавляет свободный слот на завтра', async () => {
    await hostPage.goto('/pomidorqa/profile/slots');
    const tomorrow = new Date(Date.now() + 24 * 60 * 60 * 1000);
    const date = tomorrow.toISOString().slice(0, 10);
    await slotsDateInput(hostPage).fill(date);
    await slotsTimeInput(hostPage).fill("12:00");
    await slotsAddSubmit(hostPage).click();
    await expect(slotsCard(hostPage).first()).toBeVisible();
  });

  await test.step('Гость: регистрируется отдельным аккаунтом', async () => {
    await registerUser(guestPage, guest);
  });


  await test.step("Гость: ищет хоста в каталоге по навыку (сценарий 9)", async () => {
    await catalogFilterInput(guestPage).fill(skillTag);
    await catalogFilterSubmit(guestPage).click();
    await expect(
      catalogCard(guestPage).filter({ hasText: host.name })
    ).toBeVisible();
  });

  await test.step("Гость: открывает карточку хоста", async () => {
    await catalogCard(guestPage).filter({ hasText: host.name }).click();
    await expect(personName(guestPage)).toHaveText(host.name);

  });

  await test.step('Гость: кликает по дню и времени в календаре слотов', async () => {
    await expect(async () => {
      const dayChip = bookingCalendarDay(guestPage).first();
      if (!(await dayChip.isVisible().catch(() => false))) {
        await guestPage.reload();
      }
      await expect(dayChip).toBeVisible();
    }).toPass({ timeout: 15_000 });

    await bookingCalendarDay(guestPage).first().click();
    await bookingCalendarTime(guestPage).first().click();
    await expect(bookingConfirmDialog(guestPage)).toBeVisible();
  });

  // Важно для разбора ДЗ 4: модалку guest2 открываем ДО confirm у guest.
  // Пока слот в UI ещё свободен — оба «человек открыл и отошёл».

  await test.step("Гость2: регистрируется и тоже открывает окно бронирования на тот же слот", async () => {
    await registerUser(guest2Page, guest2);

    await catalogFilterInput(guest2Page).fill(skillTag);
    await catalogFilterSubmit(guest2Page).click();
    await catalogCard(guest2Page).filter({ hasText: host.name }).click();
    await expect(personName(guest2Page)).toHaveText(host.name);

    await expect(async () => {
      const dayChip = bookingCalendarDay(guest2Page).first();
      if (!(await dayChip.isVisible().catch(() => false))) {
        await guest2Page.reload();
      }
      await expect(dayChip).toBeVisible();
    }).toPass({ timeout: 15_000 });


    await bookingCalendarDay(guest2Page).first().click();
    await bookingCalendarTime(guest2Page).first().click();
    await expect(bookingConfirmDialog(guest2Page)).toBeVisible();
  });

  await test.step("Гость: подтверждает бронирование первым — успех", async () => {
    await bookingConfirmButton(guestPage).click();
    const success = bookingConfirmSuccess(guestPage);
    const error = bookingConfirmError(guestPage);

    await expect(success.or(error)).toBeVisible({ timeout: 15_000 });
    if (await error.isVisible().catch(() => false)) {
      throw new Error(`Бронирование не удалось: ${await error.textContent()}`);
    }
  });


  await test.step("Гость2: пытается забронировать тот же слот вторым — видит ошибку", async () => {
    await bookingConfirmButton(guest2Page).click();

    const success2 = bookingConfirmSuccess(guest2Page);
    const error2 = bookingConfirmError(guest2Page);

    await expect(success2.or(error2)).toBeVisible({ timeout: 15_000 });

    // Полярность наоборот относительно гостя 1: ошибка — ожидаемый результат
    if (await success2.isVisible().catch(() => false)) {
      throw new Error('Слот должен был быть занят, но бронирование прошло успешно');
    }
    await expect(error2).toBeVisible();
  });

  await test.step('Гость: видит бронирование в разделе «Мои встречи»', async () => {
    await expect(async () => {

      await guestPage.goto("/pomidorqa/bookings");
      const card = bookingsCardName(guestPage);
      await expect(card).toHaveText(host.name);
    }).toPass({ timeout: 10_000 });

  });

  await test.step('Хост: тоже видит это бронирование в своих «Мои встречи»', async () => {
    await expect(async () => {
      await hostPage.goto("/pomidorqa/bookings");
      const card = bookingsCardName(hostPage);
      await expect(card).toHaveText(guest.name);

  });

  await hostContext.close();
  await guestContext.close();
  await guest2Context.close();
});
