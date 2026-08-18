import { test, expect, type Page } from '@playwright/test';

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
    password: 'testpass123',
  };
}

//Локаторы
const InputName = 'Имя';
const InputEmail = 'Email';
const InputPassword = 'Пароль';
const BtnReg = 'Зарегистрироваться';
const InputProfileSkill = '#pomidorqa-profile-skill-input';
const SelectCanHelp = '#pomidorqa-profile-skill-type';
const BtnAdd = 'Добавить';
const CanHelpSkill = 'can-help-skills';
const SlotDate = '#pomidorqa-slots-date';
const SlotTime = 'Время начала';
const AddSlot = '.rounded-full bg-rose-600 px-4 py-2.5 font-medium text-white hover:bg-rose-500';
const ListSkill =
  '.group flex items-center gap-1.5 rounded-full bg-gray-800 px-3 py-1 text-sm text-gray-200 hover:bg-gray-700';
const PomidorqaCatalogFilterInput = '#pomidorqa-catalog-skill-filter';
const BtnSearch = 'Найти';
const PersonCard = '#person-card';
const PersonName = '.text-2xl font-semibold text-white';
const BookingCalendarDay =
  '.rounded-xl border px-3 py-2 text-sm font-medium transition-colors border-rose-500 bg-rose-950/60 text-rose-200';
const BookingCalendarTime =
  '.rounded-full border border-gray-700 bg-gray-900 px-4 py-2 text-sm text-gray-200 transition-colors hover:border-rose-600 hover:text-rose-300';
const BookingConfirmModalDialog =
  '.w-full max-w-sm rounded-2xl border border-gray-800 bg-gray-950 p-6';
const BookingConfirmModalConfirm = 'Подтвердить';
const BookingConfirmModalSuccess =
  'Забронировано! Договоритесь о ссылке на звонок — она в разделе «Мои встречи».';
const BookingConfirmModalError = 'Не удалось забронировать слот';
const PomidorqaBookingsUpcomingSection =
  '.flex items-center justify-between rounded-2xl border border-gray-800 bg-gray-900/60 px-5 py-4';
const PomidorqaBookingsCardName = '.font-medium text-white';

// Регистрация пользователя
async function registerUser(page: Page, user: TestUser) {
  await page.goto('/pomidorqa/auth/register');
  await page.getByLabel(InputName).fill(user.name);
  await page.getByLabel(InputEmail).fill(user.email);
  await page.getByLabel(InputPassword).fill(user.password);
  await page.getByRole('button', { name: BtnReg }).click();
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
    await hostPage.locator(InputProfileSkill).fill(skillTag);
    await hostPage.locator(SelectCanHelp).selectOption('can_help');
    await hostPage.getByRole('button', { name: BtnAdd }).click();
    await expect(hostPage.getByTestId(CanHelpSkill)).toContainText(skillTag);
  });

  await test.step('Хост: добавляет свободный слот на завтра', async () => {
    await hostPage.goto('/pomidorqa/profile/slots');
    const tomorrow = new Date(Date.now() + 24 * 60 * 60 * 1000);
    const date = tomorrow.toISOString().slice(0, 10);
    await hostPage.locator(SlotDate).fill(date);
    await hostPage.getByLabel(SlotTime).fill('12:00');
    await hostPage.locator(AddSlot).click();
    await expect(hostPage.locator(ListSkill).first()).toBeVisible();
  });

  await test.step('Гость: регистрируется отдельным аккаунтом', async () => {
    await registerUser(guestPage, guest);
  });

  await test.step('Гость: ищет хоста в каталоге по навыку (сценарий 9)', async () => {
    await guestPage.locator(PomidorqaCatalogFilterInput).fill(skillTag);
    await guestPage.getByRole('button', { name: BtnSearch }).click();
    await expect(guestPage.locator(PersonCard).filter({ hasText: host.name })).toBeVisible();
  });

  await test.step('Гость: открывает карточку хоста', async () => {
    await guestPage.locator(PersonCard).filter({ hasText: host.name }).click();
    await expect(guestPage.locator(PersonName)).toHaveText(host.name);
  });

  await test.step('Гость: кликает по дню и времени в календаре слотов', async () => {
    await expect(async () => {
      const dayChip = guestPage.locator(BookingCalendarDay).first();
      if (!(await dayChip.isVisible().catch(() => false))) {
        await guestPage.reload();
      }
      await expect(dayChip).toBeVisible();
    }).toPass({ timeout: 5_000 });

    await guestPage.locator(BookingCalendarDay).first().click();
    await guestPage.locator(BookingCalendarTime).first().click();
    await expect(guestPage.locator(BookingConfirmModalDialog)).toBeVisible();
  });

  // Важно для разбора ДЗ 4: модалку guest2 открываем ДО confirm у guest.
  // Пока слот в UI ещё свободен — оба «человек открыл и отошёл».
  await test.step('Гость2: регистрируется и тоже открывает окно бронирования на тот же слот', async () => {
    await registerUser(guest2Page, guest2);
    await expect(guest2Page).toHaveURL(/\/pomidorqa\/?$/);

    await guest2Page.locator(PomidorqaCatalogFilterInput).fill(skillTag);
    await guest2Page.locator(BtnSearch).click();
    await guest2Page.locator(PersonCard).filter({ hasText: host.name }).click();
    await expect(guest2Page.getByTestId(PersonName)).toHaveText(host.name);

    await expect(async () => {
      const dayChip = guest2Page.locator(BookingCalendarDay).first();
      if (!(await dayChip.isVisible().catch(() => false))) {
        await guest2Page.reload();
      }
      await expect(dayChip).toBeVisible();
    }).toPass({ timeout: 5_000 });

    await guest2Page.locator(BookingCalendarDay).first().click();
    await guest2Page.locator(BookingCalendarTime).first().click();
    await expect(guest2Page.locator(BookingConfirmModalDialog)).toBeVisible();
  });

  await test.step('Гость: подтверждает бронирование первым — успех', async () => {
    await guestPage.getByRole('button', { name: BookingConfirmModalConfirm }).click();
    const success = guestPage.getByRole('status', { name: BookingConfirmModalSuccess });
    const error = guestPage.getByRole('alert', { name: BookingConfirmModalError });
    await expect(success.or(error)).toBeVisible({ timeout: 5_000 });
    if (await error.isVisible().catch(() => false)) {
      throw new Error(`Бронирование не удалось: ${await error.textContent()}`);
    }
  });

  await test.step('Гость2: пытается забронировать тот же слот вторым — видит ошибку', async () => {
    await guest2Page.getByTestId(BookingConfirmModalConfirm).click();

    const success2 = guest2Page.getByRole('status', { name: BookingConfirmModalSuccess });
    const error2 = guest2Page.getByRole('alert', { name: BookingConfirmModalError });
    await expect(success2.or(error2)).toBeVisible({ timeout: 5_000 });

    // Полярность наоборот относительно гостя 1: ошибка — ожидаемый результат
    if (await success2.isVisible().catch(() => false)) {
      throw new Error('Слот должен был быть занят, но бронирование прошло успешно');
    }
    await expect(error2).toBeVisible();
  });

  await test.step('Гость: видит бронирование в разделе «Мои встречи»', async () => {
    await expect(async () => {
      await guestPage.goto('/pomidorqa/bookings');
      const card = guestPage
        .locator(PomidorqaBookingsUpcomingSection)
        .locator(PomidorqaBookingsCardName);
      await expect(card).toHaveText(host.name);
    }).toPass({ timeout: 5_000 });
  });

  await test.step('Хост: тоже видит это бронирование в своих «Мои встречи»', async () => {
    await expect(async () => {
      await hostPage.goto('/pomidorqa/bookings');
      const card = hostPage
        .locator(PomidorqaBookingsUpcomingSection)
        .locator(PomidorqaBookingsCardName);
      await expect(card).toHaveText(guest.name);
    }).toPass({ timeout: 5_000 });
  });

  await hostContext.close();
  await guestContext.close();
  await guest2Context.close();
});
