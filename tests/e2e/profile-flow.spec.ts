import { test, expect, type BrowserContext } from '@playwright/test';
import { makeUser, registerUser, reload, cleanupUsersViaApi } from '../helpers/user';
import { ProfilePage } from '../pages/ProfilePage';

test.describe('Профиль: действия с полями', () => {
  let profilePage: ProfilePage;
  let context: BrowserContext;

  test.beforeEach(async ({ browser }) => {
    const user = makeUser('test', Date.now());
    context = await browser.newContext();
    const hostContext = await browser.newContext();
    const hostPage = await hostContext.newPage();
    profilePage = new ProfilePage(hostPage);

    await registerUser(hostContext.request, user);
    await profilePage.goto();
  });

  test.afterEach(async () => {
    await cleanupUsersViaApi([context]);
    await context.close();
  });

  test('имя: вводим новое и сохраняем', async () => {
    const newName = `Новое имя ${Date.now()}`;

    await test.step('Сохраняем имя', async () => {
      await profilePage.changeName(newName);
    });

    await test.step('После перезагрузки имя пришло с сервера', async () => {
      await reload(profilePage.page);
      await expect(profilePage.nameInput).toHaveValue(newName);
    });
  });

  test('Telegram: заполняем и сохраняем', async () => {
    const telegram = `@user_${Date.now()}`;

    await test.step('Сохраняем Telegram', async () => {
      await profilePage.changeTelegram(telegram);
    });

    await test.step('После перезагрузки Telegram пришёл с сервера', async () => {
      await reload(profilePage.page);
      await expect(profilePage.telegramInput).toHaveValue(telegram);
    });
  });

  test('часовой пояс: выбираем и сохраняем', async () => {
    const timezone = 'Asia/Novosibirsk';

    await test.step('Выбираем часовой пояс', async () => {
      await profilePage.changeTimezone(timezone);
    });

    await test.step('После перезагрузки выбран новый пояс', async () => {
      await reload(profilePage.page);
      await expect(profilePage.timezoneSelect).toHaveValue(timezone);
    });
  });

  test('о себе: заполняем и сохраняем', async () => {
    const bio = `QA-инженер ${Date.now()}`;

    await test.step('Сохраняем "О себе"', async () => {
      await profilePage.changeBio(bio);
    });

    await test.step('После перезагрузки текст пришёл с сервера', async () => {
      await reload(profilePage.page);
      await expect(profilePage.bioInput).toHaveValue(bio);
    });
  });

  test('навык: добавляем "Могу помочь"', async () => {
    const tag = `Skill-${Date.now()}`;

    await test.step('Добавляем навык "Могу помочь"', async () => {
      await profilePage.addSkill(tag, 'can_help');
    });

    await test.step('Навык появился в блоке "Могу помочь"', async () => {
      await expect(profilePage.canHelpSkills).toContainText(tag);
    });
  });

  test('негатив: пустой навык не добавляется', async () => {
    await test.step('Пытаемся добавить пустой навык', async () => {
      await profilePage.addSkill('', 'can_help');
    });

    await test.step('Ни одного навыка не появилось', async () => {
      await expect(profilePage.skillChips).toHaveCount(0);
    });
  });

  test('Удаление навыка', async () => {
    const tag = `Skill-${Date.now()}`;

    await test.step('Добавляем навык', async () => {
      await profilePage.addSkill(tag, 'can_help');
      await expect(profilePage.canHelpSkills).toContainText(tag);
    });

    await test.step('Удаляем навык', async () => {
      const removeButton = profilePage.removeSkillButton(tag);
      await expect(removeButton).toBeVisible({ timeout: 5_000 });

      await profilePage.removeSkill(tag);

      await expect(profilePage.skillTag(tag)).toHaveCount(0, { timeout: 5_000 });
    });

    await test.step('Навык исчез из блока "Могу помочь"', async () => {
      await reload(profilePage.page);
      await expect(profilePage.skillTag(tag)).toHaveCount(0, {
        timeout: 10_000,
      });
    });
  });

  test('Форма профиля: три поля сохраняются за раз', async () => {
    const runId = Date.now();
    const name = `Имя ${runId}`;
    const telegram = `@user_${runId}`;
    const bio = `Bio ${runId}`;

    await test.step('Сохраняем имя, Telegram и "О себе" разом', async () => {
      await profilePage.fillName(name);
      await profilePage.fillTelegram(telegram);
      await profilePage.fillBio(bio);
    });

    await test.step('Сохраняем форму один раз', async () => {
      await profilePage.saveProfile();
    });

    await test.step('После перезагрузки все три значения пришли с сервера', async () => {
      await reload(profilePage.page);
      await expect(profilePage.nameInput).toHaveValue(name, {
        timeout: 30_000,
      });
      await expect(profilePage.telegramInput).toHaveValue(telegram, {
        timeout: 30_000,
      });
      await expect(profilePage.bioInput).toHaveValue(bio, {
        timeout: 30_000,
      });
    });
  });
});
