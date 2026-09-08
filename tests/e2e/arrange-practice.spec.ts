import { test, expect, type Page } from '@playwright/test';
import { makeUser, makeUnique, type TestUser } from './helpers/user';

const Registr = (page: Page) => ({
  InputName: () => page.getByLabel('Имя'),
  InputEmail: () => page.getByLabel('Email'),
  InputPassword: () => page.getByLabel('Пароль'),
  BtnReg: () => page.getByRole('button', { name: 'Зарегистрироваться' }),
});

const Profile = (page: Page) => ({
  InputProfileSkill: () => page.locator('#pomidorqa-profile-skill-input'),
  SelectSkillType: () => page.locator('#pomidorqa-profile-skill-type'),
  BtnAdd: () => page.getByRole('button', { name: 'Добавить' }),
  CanHelpSkill: () => page.getByTestId('can-help-skills'),
  InputTelegram: () => page.locator('[placeholder="@username"]'),
  InputAboutMe: () => page.getByLabel('О себе'),
});

const Slots = (page: Page) => ({
  SlotDate: () => page.locator('#pomidorqa-slots-date'),
  SlotTime: () => page.locator('#pomidorqa-slots-time'),
  AddSlot: () => page.getByRole('button', { name: 'Добавить слот' }),
  ListSkill: () => page.locator('//div[@data-slot-status ="free"]'),
});

const Catalog = (page: Page) => ({
  FilterInput: () => page.locator('#pomidorqa-catalog-skill-filter'),
  BtnSearch: () => page.getByRole('button', { name: 'Найти' }),
  PersonCard: () => page.locator('[data-testid="person-card"]'),
  PersonName: () => page.locator('h1'),
});

const Booking = (page: Page) => ({
  CalendarDay: () => page.locator('[aria-pressed="true"]'),
  CalendarTime: () => page.getByRole('group', { name: 'Время слотов' }).getByRole('button'),
  ConfirmModalDialog: () => page.locator('[role="dialog"]'),
  ConfirmModalConfirm: () => page.getByRole('button', { name: 'Подтвердить' }),
  ConfirmModalSuccess: () => page.getByText('Забронировано'),
  ConfirmModalError: () => page.getByText('Этот слот только что забронировали'),
});

const Bookings = (page: Page) => ({
  UpcomingSection: () => page.getByTestId('upcoming-meetings'),
});

const telegramUsername = makeUnique('@student');
const aboutMe = makeUnique('AQA Junior');
const uniqueskill = makeUnique('skill');

async function registerUser(page: Page, user: TestUser) {
  await page.goto('/pomidorqa/auth/register');
  const registr = Registr(page);
  await registr.InputName().fill(user.name);
  await registr.InputEmail().fill(user.email);
  await registr.InputPassword().fill(user.password);
  await registr.BtnReg().click();
  await expect(page).toHaveURL(/\/pomidorqa\/?$/);
}

test.describe('Ввод данных после регистрации', () => {
  let user: TestUser;

  test.beforeEach(async ({ page }) => {
    const runId = Date.now();
    user = makeUser('studentDG', runId);
    await registerUser(page, user);
    await page.goto('/pomidorqa/profile');
    await expect(page.getByLabel('Имя')).toHaveValue(user.name);
  });

  test('Заполнение полей "Telegram" и "О себе" на странице профиля ', async ({ page }) => {
    const profile = Profile(page);
    await profile.InputTelegram().fill(telegramUsername);
    await profile.InputAboutMe().fill(aboutMe);
    await expect(profile.InputTelegram()).toHaveValue(telegramUsername);
    await expect(profile.InputAboutMe()).toHaveValue(aboutMe);
  });

  test('Добавление навыка', async ({ page }) => {
    const profile = Profile(page);
    await profile.InputProfileSkill().fill(uniqueskill);
    await profile.SelectSkillType().selectOption('can_help');
    await profile.BtnAdd().click();
    await expect(profile.CanHelpSkill()).toContainText(uniqueskill);
  });
});
