import { test, expect, type Page } from '@playwright/test';
import { makeUser, makeUnique, registerUser, type TestUser } from '../helpers/user';

const Bookings = (page: Page) => ({
  UpcomingSection: () => page.getByTestId('upcoming-meetings'),
});

const Profile = (page: Page) => ({
  InputProfileSkill: () => page.locator('#pomidorqa-profile-skill-input'),
  SelectSkillType: () => page.locator('#pomidorqa-profile-skill-type'),
  BtnAdd: () => page.getByRole('button', { name: 'Добавить' }),
  CanHelpSkill: () => page.getByTestId('can-help-skills'),
  InputTelegram: () => page.locator('[placeholder="@username"]'),
  InputAboutMe: () => page.getByLabel('О себе'),
});

const telegramUsername = makeUnique('@student');
const aboutMe = makeUnique('AQA Junior');
const uniqueskill = makeUnique('skill');

test.describe('Ввод данных после регистрации', () => {
  let user: TestUser;

  test.beforeEach(async ({ page }) => {
    const runId = Date.now();
    user = makeUser('studentDG', runId);
    await registerUser(page, user);
    await page.goto('/pomidorqa/profile');
    await expect(page.getByLabel('Имя')).toHaveValue(user.name);
  });

  test('Заполнение полей "Telegram" и "О себе" на странице профиля', async ({ page }) => {
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
