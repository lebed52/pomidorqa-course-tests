import { test, expect } from '@playwright/test';
import { makeUser, registerUser } from '../helpers/user';
import { ProfilePage } from '../pages/ProfilePage';

test.describe('Профиль: действия с полями', () => {
  let profilePage: ProfilePage;

  test.beforeEach(async ({ page }) => {
    const user = makeUser('test', Date.now());
    await registerUser(page, user);
    profilePage = new ProfilePage(page);
    await profilePage.goto();
  });

  test('имя: вводим новое и сохраняем', async () => {
    const newName = `Новое имя ${Date.now()}`;
    await profilePage.changeName(newName);
    await profilePage.reload();
    await profilePage.expectName(newName);
  });

  test('telegram: заполняем и сохраняем', async () => {
    const telegram = `@user_${Date.now()}`;
    await profilePage.changeTelegram(telegram);
    await profilePage.reload();
    await profilePage.expectTelegram(telegram);
  });

  test('часовой пояс: выбираем и сохраняем', async () => {
    const timezone = 'Asia/Novosibirsk';
    await profilePage.changeTimezone(timezone);
    await profilePage.reload();
    await profilePage.expectTimezone(timezone);
  });

  test('о себе: заполняем и сохраняем', async () => {
    const bio = `QA-инженер ${Date.now()}`;
    await profilePage.changeBio(bio);
    await profilePage.reload();
    await profilePage.expectBio(bio);
  });

  test('навык: добавляем "Могу помочь"', async () => {
    const tag = `Skill-${Date.now()}`;
    await profilePage.addSkill(tag, 'can_help');
    await profilePage.expectCanHelpContains(tag);
  });

  test('негатив: пустой навык не добавляется', async () => {
    await profilePage.addSkill('', 'can_help');
    await profilePage.expectNoSkills();
  });

  test('удаление навыка', async () => {
    const tag = `Skill-${Date.now()}`;
    await profilePage.addSkill(tag, 'can_help');
    await profilePage.expectCanHelpContains(tag);
    await profilePage.removeSkill(tag);
    await profilePage.expectCanHelpNotContains(tag);
  });

  test('форма профиля: три поля сохраняются за раз', async () => {
    const runId = Date.now();
    const name = `Имя ${runId}`;
    const telegram = `@user_${runId}`;
    const bio = `Bio ${runId}`;

    await profilePage.changeName(name);
    await profilePage.changeTelegram(telegram);
    await profilePage.changeBio(bio);

    await profilePage.reload();
    await profilePage.expectName(name);
    await profilePage.expectTelegram(telegram);
    await profilePage.expectBio(bio);
  });
});
