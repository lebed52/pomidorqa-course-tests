import { test, expect } from '@playwright/test';
import { makeUser, makeUnique, type TestUser } from './helpers/user';
import { ProfilePage } from './pages/profile';
import { RegistrPage } from './pages/registr';

test.describe('Заполнение профиля после регистрации', () => {
  let user: TestUser;
  let profilePage: ProfilePage;
  let registrPage: RegistrPage;

  test.beforeEach(async ({ page }) => {
    const runId = Date.now();
    user = makeUser('student-hw8', runId);
    registrPage = new RegistrPage(page);
    await registrPage.register(user);
    profilePage = new ProfilePage(page);
    await profilePage.open();
    await expect(profilePage.inputName).toHaveValue(user.name);
  });

  test('Смена имени в профиле', async ({ page }) => {
    const newName = makeUnique('Hw10');
    await profilePage.inputName.clear();
    await profilePage.inputName.fill(newName);
    await profilePage.save();
    await page.reload();
    await expect(profilePage.inputName).toHaveValue(newName);
  });

  test('Выбор часового пояса из списка', async ({ page }) => {
    const timezone = 'Asia/Yekaterinburg';
    await test.step('Выбираем часовой пояс и сохраняем', async () => {
      await expect(profilePage.timezoneSelect).toHaveValue('Europe/Moscow');
      await profilePage.timezoneSelect.selectOption(timezone);
      await profilePage.save();
    });

    await test.step('После перезагрузки выбран новый пояс', async () => {
      await page.reload();
      await expect(profilePage.timezoneSelect).toHaveValue(timezone);
    });
  });

  test('Заполнение поля Telegram', async ({ page }) => {
    const telegram = `@qaDarya${Date.now()}`;
    await test.step('Заполняем и сохраняем', async () => {
      await expect(profilePage.inputTelegram).toHaveValue('');
      await profilePage.inputTelegram.fill(telegram);
      await profilePage.save();
    });

    await test.step('После обновления страницы Telegram пришёл с сервера', async () => {
      await page.reload();
      await expect(profilePage.inputTelegram).toHaveValue(telegram);
    });
  });

  test('Заполняем поле "О себе"', async ({ page }) => {
    const infoAboutMyself = `QA-student ${Date.now()}`;
    await test.step('Заполняем и сохраняем', async () => {
      await profilePage.inputAboutMe.fill(infoAboutMyself);
      await profilePage.save();
    });

    await test.step('После обновления текст пришёл с сервера', async () => {
      await page.reload();
      await expect(profilePage.inputAboutMe).toHaveValue(infoAboutMyself);
    });
  });

  test('Навык: заполняем, выбираем, добавляем', async ({ page }) => {
    const skillTag = `Playwright-demo-${Date.now()}`;
    await test.step('Добавляем навык «могу помочь»', async () => {
      await profilePage.addSkill(skillTag);
      await profilePage.canHelpSkills;
      profilePage.save();
    });

    await test.step('Навык появился в блоке «Могу помочь»', async () => {
      await expect(profilePage.canHelpSkills).toContainText(skillTag);
    });
  });
});
