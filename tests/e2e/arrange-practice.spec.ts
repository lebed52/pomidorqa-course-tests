import { test, expect } from '@playwright/test';
import { makeUser, makeUnique, registerUser, type TestUser } from '../helpers/user';
import { ProfilePage } from '../pages/profile';

const telegramUsername = makeUnique('@student');
const aboutMe = makeUnique('AQA Junior');
const uniqueskill = makeUnique('skill');

test.describe('Ввод данных после регистрации', () => {
  let user: TestUser;
  let profilePage: ProfilePage;

  test.beforeEach(async ({ page }) => {
    const runId = Date.now();
    user = makeUser('studentDG', runId);
    await registerUser(page, user);
    profilePage = new ProfilePage(page);
    await profilePage.open();
    await expect(profilePage.inputName).toHaveValue(user.name);
  });

  test('Заполнение поля "Telegram" на странице профиля', async ({ page }) => {
    await test.step('Заполняем Telegram и сохраняем', async () => {
      await profilePage.inputTelegram.fill(telegramUsername);
      await profilePage.save();
    });

    await test.step('После перезагрузки Telegram пришёл с сервера', async () => {
      await page.reload();
      await expect(profilePage.inputTelegram).toHaveValue(telegramUsername);
    });
  });

  test('Заполнение поля "О себе" на странице профиля', async ({ page }) => {
    await test.step('Заполняем «О себе» и сохраняем', async () => {
      await profilePage.inputAboutMe.fill(aboutMe);
      await profilePage.save();
    });

    await test.step('После перезагрузки текст пришёл с сервера', async () => {
      await page.reload();
      await expect(profilePage.inputAboutMe).toHaveValue(aboutMe);
    });
  });

  test('Добавление навыка', async () => {
    await test.step('Добавляем навык «могу помочь»', async () => {
      await profilePage.addSkill(uniqueskill);
    });

    await test.step('Навык появился в блоке «Могу помочь»', async () => {
      await expect(profilePage.canHelpSkills).toContainText(uniqueskill);
    });
  });
});
