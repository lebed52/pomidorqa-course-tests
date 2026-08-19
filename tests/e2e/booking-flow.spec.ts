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
const REGISTER_NAME = '#pomidorqa-register-name';
const REGISTER_EMAIL = '#pomidorqa-register-email';
const REGISTER_PASSWORD = '#pomidorqa-register-password';
const REGISTER_BUTTON = 'Зарегистрироваться';

const SKILL_INPUT = '#pomidorqa-profile-skill-input';
const SKILL_TYPE = '#pomidorqa-profile-skill-type';
const ADD_SKILL_BUTTON = 'Добавить';

const SLOT_DATE = '#pomidorqa-slots-date';
const SLOT_TIME = '#pomidorqa-slots-time';
const ADD_SLOT_BUTTON = 'Добавить слот';
const SLOT_CARD = '[data-slot-id]';

async function registerUser(page: Page, user: TestUser) {
  await page.goto('/pomidorqa/auth/register');
  await page.locator(REGISTER_NAME).fill(user.name);
  await page.locator(REGISTER_EMAIL).fill(user.email);
  await page.locator(REGISTER_PASSWORD).fill(user.password);
  await page.getByRole('button', { name: REGISTER_BUTTON }).click();
  await expect(page).toHaveURL(/\/pomidorqa\/?$/);
}

async function searchHostBySkill(page: Page, user: TestUser, skillTag: string, hostName: string) {
  await page.locator('#pomidorqa-catalog-skill-filter').fill(skillTag);
  await page.getByRole('button', { name: 'Найти' }).click();
  await expect(page.getByTestId('person-card').filter({ hasText: hostName })).toBeVisible();
}

async function openHostCard(page: Page, hostName: string) {
  await page.getByTestId('person-card').filter({ hasText: hostName }).click();
  await expect(page.locator('h1')).toHaveText(hostName);
}

async function selectSlot(page: Page) {
  await expect(async () => {
    const dayChip = page.locator('[data-date]').first();
    if (!(await dayChip.isVisible().catch(() => false))) {
      await page.reload();
    }
    await expect(dayChip).toBeVisible();
  }).toPass({ timeout: 10_000 });
  
  await page.locator('[data-date]').first().click();
  await page.locator('[data-slot-id]').first().click();
  await expect(page.locator('[aria-labelledby]')).toBeVisible();
}

async function confirmBooking(page: Page) {
    await page.getByRole('button', { name: 'Подтвердить' }).click();
    const success = page.getByText(
      'Забронировано! Договоритесь о ссылке на звонок — она в разделе «Мои встречи».Зак',
    );
    const error = page.getByText('Этот слот только что забронировали — выбери другой');
    await expect(success.or(error)).toBeVisible({ timeout: 15_000 });

    if (await error.isVisible().catch(() => false)) {
      throw new Error(`Бронирование не удалось: ${await error.textContent()}`);
    }
}

async function confirmBookingExpectError(page: Page) {
  await page.getByRole('button', { name: 'Подтвердить' }).click();
  const success = page.getByText('Забронировано! Договоритесь о ссылке на звонок — она в разделе «Мои встречи».Зак');
  const error = page.getByText('Этот слот только что забронировали — выбери другой');
  await expect(success.or(error)).toBeVisible({ timeout: 15_000 });
  
  if (await success.isVisible().catch(() => false)) {
    throw new Error('Слот должен был быть занят, но бронирование прошло успешно');
  }
  await expect(error).toBeVisible();
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
    await hostPage.locator(SKILL_INPUT).fill(skillTag);
    await hostPage.locator(SKILL_TYPE).selectOption('can_help');
    await hostPage.getByRole('button', { name: ADD_SKILL_BUTTON }).click();
    await expect(hostPage.getByText(skillTag)).toBeVisible();
  });

  await test.step('Хост: добавляет свободный слот на завтра', async () => {
    await hostPage.goto('/pomidorqa/profile/slots');
    const tomorrow = new Date(Date.now() + 24 * 60 * 60 * 1000);
    const date = tomorrow.toISOString().slice(0, 10);
    await hostPage.locator(SLOT_DATE).fill(date);
    await hostPage.locator(SLOT_TIME).fill('12:00');
    await hostPage.getByRole('button', { name: ADD_SLOT_BUTTON }).click();
    await expect(hostPage.locator(SLOT_CARD).first()).toBeVisible();
  });

  //Действия первого гостя (бронирует слот)
  await test.step('Гость: регистрируется отдельным аккаунтом', async () => {
    await registerUser(guestPage, guest);
  });
  await test.step('Гость: ищет хоста в каталоге по навыку (сценарий 9)', async () => {
    await searchHostBySkill(guestPage, guest, skillTag, host.name);
  });
  await test.step('Гость: открывает карточку хоста', async () => {
    await openHostCard(guestPage, host.name);
  });
  await test.step('Гость: кликает по дню и времени в календаре слотов', async () => {
    await selectSlot(guestPage);
  });

  //Действия второго гостя (бронирует слот)
  await test.step('Гость2: регистрируется и тоже открывает окно бронирования на тот же слот', async () => {
    await registerUser(guest2Page, guest2);
  });
  await test.step('Гость2: ищет хоста в каталоге по навыку (сценарий 9)', async () => {
    await searchHostBySkill(guest2Page, guest2, skillTag, host.name);
  });
  await test.step('Гость2: открывает карточку хоста', async () => {
    await openHostCard(guest2Page, host.name);
  });
  await test.step('Гость2: кликает по дню и времени в календаре слотов', async () => {
    await selectSlot(guest2Page);
  });

  await test.step('Гость: подтверждает бронирование первым — успех', async () => {
    await confirmBooking(guestPage);
  });
  await test.step('Гость2: пытается забронировать тот же слот вторым — видит ошибку', async () => {
    await confirmBookingExpectError(guest2Page);
  });

  await test.step('Гость: видит бронирование в разделе «Мои встречи»', async () => {
    await expect(async () => {
      await guestPage.goto('/pomidorqa/bookings');
      const card = guestPage.locator('[data-booking-id]').getByText(host.name);
      await expect(card).toHaveText(host.name);
    }).toPass({ timeout: 10_000 });
  });

  await test.step('Хост: тоже видит это бронирование в своих «Мои встречи»', async () => {
    await expect(async () => {
      await hostPage.goto('/pomidorqa/bookings');
      const card = hostPage.locator('[data-booking-id]').getByText(guest.name);
      await expect(card).toHaveText(guest.name);
    }).toPass({ timeout: 10_000 });
  });

  await hostContext.close();
  await guestContext.close();
  await guest2Context.close();
});
