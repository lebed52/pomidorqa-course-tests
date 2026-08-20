import { test, expect, type Page } from '@playwright/test';

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

async function registerUser(page: Page, user: TestUser) {
  await page.goto('/pomidorqa/auth/register');
  await InputName(page).fill(user.name);
  await InputEmail(page).fill(user.email);
  await InputPassword(page).fill(user.password);
  await BtnReg(page).click();
  await expect(page).toHaveURL(/\/pomidorqa\/?$/);
}

test.describe('свой мир на каждый тест', () => {
  let user: TestUser;

  test.beforeEach(async ({ page }) => {
    const runId = Date.now();
    const user = makeUser('studentDaryaGembar', runId);
    test.info().annotations.push({ type: 'user', description: user.email });

    await registerUser(page, user);

    await page.goto('/pomidorqa/auth/register');
  });

  test('мир 1:из главной открывается профиль', async ({ page }) => {
    await page.goto('/pomidorqa/profile');
  });

  test('мир 2:после регистрации виден блок «Мои встречи»', async ({ page }) => {
    await page.goto('/pomidorqa/bookings');
  });
});
