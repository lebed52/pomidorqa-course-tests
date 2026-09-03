import { test, expect } from '@playwright/test';
import { ProfilePage } from '../pages/profile-page';
import { makeUser, registerUser } from '../helpers/user';

test.describe('Внесение данных в профиле', () => {
  let profilePage: ProfilePage;
  let skillTag: string;

  test.beforeEach(async ({ page }) => {
    await test.step('Подготовка: Регистрация и переход в профиль', async () => {
      const runId = Date.now();
      const user = makeUser('user', runId);
      profilePage = new ProfilePage(page);
      skillTag = `Skill-${runId}`;

      await registerUser(page, user);
      await profilePage.goto();
    });
  });

  test('профиль: имя сохраняется после перезагрузки', async ({ page }) => {
    const username = `имя ${Date.now()}`;

    await test.step('Заполнить и сохранить новое имя', async () => {
      await profilePage.profileNameInput.fill(username);
      await profilePage.saveProfile();
    });

    await test.step('После перезагрузки имя пришло с сервера', async () => {
      await page.reload();
      await expect(profilePage.profileNameInput).toHaveValue(username);
    });
  });

  test('профиль: telegram сохраняется после перезагрузки', async ({ page }) => {
    const telegramName = `@TG-${Date.now()}`;

    await test.step('Заполнить и сохранить Telegram', async () => {
      await profilePage.profileTelegramInput.fill(telegramName);
      await profilePage.saveProfile();
    });

    await test.step('После перезагрузки Telegram пришёл с сервера', async () => {
      await page.reload();
      await expect(profilePage.profileTelegramInput).toHaveValue(telegramName);
    });
  });

  test('профиль: часовой пояс сохраняется после перезагрузки', async ({ page }) => {
    const timezoneIrkutsk = 'Asia/Irkutsk';

    await test.step('Выбрать и сохранить часовой пояс', async () => {
      await profilePage.profileTimezoneSelect.selectOption(timezoneIrkutsk);
      await profilePage.saveProfile();
    });

    await test.step('После перезагрузки выбран новый пояс', async () => {
      await page.reload();
      await expect(profilePage.profileTimezoneSelect).toHaveValue(timezoneIrkutsk);
    });
  });

  test('профиль: описание "о себе" сохраняется после перезагрузки', async ({ page }) => {
    const aboutText = `About me ${Date.now()}`;

    await test.step('Заполнить поле "О себе" и сохранить', async () => {
      await profilePage.profileAboutInput.fill(aboutText);
      await profilePage.saveProfile();
    });

    await test.step('После перезагрузки текст пришёл с сервера', async () => {
      await page.reload();
      await expect(profilePage.profileAboutInput).toHaveValue(aboutText);
    });
  });

  test('навыки: добавленный навык появляется в списке', async () => {
    await test.step('Добавить навык', async () => {
      await profilePage.addSkill(skillTag, 'Хочу разобрать');
    });

    await test.step('Проверить появление тега навыка', async () => {
      await expect(profilePage.getProfileSkillTagByName(skillTag)).toBeVisible();
    });
  });

  test('навыки: удалённый навык пропадает из списка', async () => {
    await test.step('Добавить навык', async () => {
      await profilePage.addSkill(skillTag, 'Хочу разобрать');
    });

    await test.step('Удалить добавленный навык', async () => {
      await profilePage.profileSkillDrop.click();
    });

    await test.step('Проверить, что кнопка удаления больше не видна', async () => {
      await expect(profilePage.profileSkillDrop).not.toBeVisible();
    });
  });

  test('навыки: три навыка добавляются и отображаются все', async () => {
    const skillTag1 = `${skillTag}-1`;
    const skillTag2 = `${skillTag}-2`;
    const skillTag3 = `${skillTag}-3`;

    await test.step('Добавить 3 навыка', async () => {
      await profilePage.addSkill(skillTag1, 'Хочу разобрать');
      await expect(profilePage.getProfileSkillTagByName(skillTag1)).toBeVisible();

      await profilePage.addSkill(skillTag2, 'Хочу разобрать');
      await expect(profilePage.getProfileSkillTagByName(skillTag2)).toBeVisible();

      await profilePage.addSkill(skillTag3, 'Хочу разобрать');
      await expect(profilePage.getProfileSkillTagByName(skillTag3)).toBeVisible();
    });

    await test.step('Проверить, что на странице отображаются ровно 3 тега навыков', async () => {
      await expect(profilePage.profileSkillTags).toHaveCount(3);
    });
  });

  test('навыки: поле ввода очищается после добавления', async () => {
    await test.step('Добавить навык', async () => {
      await profilePage.addSkill(skillTag, 'Хочу разобрать');
    });

    await test.step('Дождаться появления тега в UI', async () => {
      await expect(profilePage.getProfileSkillTagByName(skillTag)).toBeVisible();
    });

    await test.step('Проверить, что инпут ввода навыка снова пуст', async () => {
      await expect(profilePage.profileSkillInput).toHaveValue('');
    });
  });
});
