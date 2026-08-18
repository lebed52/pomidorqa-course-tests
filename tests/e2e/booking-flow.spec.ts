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

const BookingCalendarDay = (page: Page) => page.locator('.rounded-xl.border.px-3.py-2');
const BookingCalendarTime = (page: Page) =>
  page.locator('.rounded-full.border.border-gray-700.bg-gray-900');
const BookingConfirmModalDialog = (page: Page) =>
  page.locator('.w-full.max-w-sm.rounded-2xl.border.border-gray-800.bg-gray-950.p-6');

const BookingConfirmModalConfirm = (page: Page) =>
  page.getByRole('button', { name: 'Подтвердить' });
const BookingConfirmModalSuccess = (page: Page) => page.getByText('Забронировано');
const BookingConfirmModalError = (page: Page) =>
  page.getByText('Этот слот только что забронировали');

const PomidorqaBookingsUpcomingSection = (page: Page) => page.getByTestId('upcoming-meetings');

async function registerUser(page: Page, user: TestUser) {
  await page.goto('/pomidorqa/auth/register');
  await InputName(page).fill(user.name);
  await InputEmail(page).fill(user.email);
  await InputPassword(page).fill(user.password);
  await BtnReg(page).click();
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
    await hostPage.goto('/pomidorqa/profile');
    await InputProfileSkill(hostPage).fill(skillTag);
    await SelectSkillType(hostPage).selectOption('can_help');
    await BtnAdd(hostPage).click();
    await expect(CanHelpSkill(hostPage)).toContainText(skillTag);
  });

  await test.step('Хост: добавляет свободный слот на завтра', async () => {
    await hostPage.goto('/pomidorqa/profile/slots');
    const tomorrow = new Date(Date.now() + 24 * 60 * 60 * 1000);
    const date = tomorrow.toISOString().slice(0, 10);
    await SlotDate(hostPage).fill(date);
    await SlotTime(hostPage).fill('12:00');
    await AddSlot(hostPage).click();
    await expect(ListSkill(hostPage)).toBeVisible();
  });

  await test.step('Гость: регистрируется отдельным аккаунтом', async () => {
    await registerUser(guestPage, guest);
  });

  await test.step('Гость: ищет хоста в каталоге по навыку (сценарий 9)', async () => {
    await PomidorqaCatalogFilterInput(guestPage).fill(skillTag);
    await BtnSearch(guestPage).click();
    await expect(PersonCard(guestPage).filter({ hasText: host.name })).toBeVisible();
  });

  await test.step('Гость: открывает карточку хоста', async () => {
    await PersonCard(guestPage).filter({ hasText: host.name }).click();
    await expect(PersonName(guestPage)).toHaveText(host.name);
  });

  await test.step('Гость: кликает по дню и времени в календаре слотов', async () => {
    await expect(async () => {
      const dayChip = BookingCalendarDay(guestPage).first();
      if (!(await dayChip.isVisible().catch(() => false))) {
        await guestPage.reload();
      }
      await expect(dayChip).toBeVisible();
    }).toPass({ timeout: 15_000 });

    await BookingCalendarDay(guestPage).first().click();
    await BookingCalendarTime(guestPage).first().click();
    await expect(BookingConfirmModalDialog(guestPage)).toBeVisible();
  });

  // Важно для разбора ДЗ 4: модалку guest2 открываем ДО confirm у guest.
  // Пока слот в UI ещё свободен — оба «человек открыл и отошёл».
  await test.step('Гость2: регистрируется и тоже открывает окно бронирования на тот же слот', async () => {
    await registerUser(guest2Page, guest2);
    await expect(guest2Page).toHaveURL(/\/pomidorqa\/?$/);

    await PomidorqaCatalogFilterInput(guest2Page).fill(skillTag);
    await BtnSearch(guest2Page).click();
    await PersonCard(guest2Page).filter({ hasText: host.name }).click();
    await expect(PersonName(guest2Page)).toHaveText(host.name);

    await expect(async () => {
      const dayChip = BookingCalendarDay(guest2Page).first();
      if (!(await dayChip.isVisible().catch(() => false))) {
        await guest2Page.reload();
      }
      await expect(dayChip).toBeVisible();
    }).toPass({ timeout: 15_000 });

    await BookingCalendarDay(guest2Page).first().click();
    await BookingCalendarTime(guest2Page).first().click();
    await expect(BookingConfirmModalDialog(guest2Page)).toBeVisible();
  });

  await test.step('Гость: подтверждает бронирование первым — успех', async () => {
    await BookingConfirmModalConfirm(guestPage).click();
    const success = BookingConfirmModalSuccess(guestPage);
    const error = BookingConfirmModalError(guestPage);
    await expect(success.or(error)).toBeVisible({ timeout: 15_000 });
    if (await error.isVisible().catch(() => false)) {
      throw new Error(`Бронирование не удалось: ${await error.textContent()}`);
    }
  });

  await test.step('Гость2: пытается забронировать тот же слот вторым — видит ошибку', async () => {
    await BookingConfirmModalConfirm(guest2Page).click();

    const success2 = BookingConfirmModalSuccess(guest2Page);
    const error2 = BookingConfirmModalError(guest2Page);
    await expect(success2.or(error2)).toBeVisible({ timeout: 15_000 });

    // Полярность наоборот относительно гостя 1: ошибка — ожидаемый результат
    if (await success2.isVisible().catch(() => false)) {
      throw new Error('Слот должен был быть занят, но бронирование прошло успешно');
    }
    await expect(error2).toBeVisible();
  });

  await test.step('Гость: видит бронирование в разделе «Мои встречи»', async () => {
    await expect(async () => {
      await guestPage.goto('/pomidorqa/bookings');
      const card = PomidorqaBookingsUpcomingSection(guestPage);
      await expect(card).toContainText(host.name);
    }).toPass({ timeout: 15_000 });
  });

  await test.step('Хост: тоже видит это бронирование в своих «Мои встречи»', async () => {
    await expect(async () => {
      await hostPage.goto('/pomidorqa/bookings');
      const card = PomidorqaBookingsUpcomingSection(hostPage);
      await expect(card).toContainText(guest.name);
    }).toPass({ timeout: 15_000 });
  });

  await hostContext.close();
  await guestContext.close();
  await guest2Context.close();
});
