import { test, expect, type Page } from '@playwright/test';
import { ProfilePage } from '../pages/profile-page';
import { makeUser, registerUser } from '../helpers/user';
import { userInfo } from 'os';

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
      await page.goto('/pomidorqa/profile');
    });
  });

  // Тест №1
  test('Тест №1: Изменение имени в профиле', async ({ page }) => {
    const username = `имя ${Date.now()}`;

    await test.step('Заполнить и сохранить новое имя', async () => {
      await profilePage.profileNameInput.fill(username);
      await profilePage.profileSaveButton.click();
    });

    await test.step('Проверить, что новое имя сохранилось', async () => {
      await expect(profilePage.profileNameInput).toHaveValue(username);
    });
  });

  // Тест №2
  test('Тест №2: Изменение профиля Telegram в профиле', async ({ page }) => {
    const telegramName = `@TG-${Date.now()}`;

    await test.step('Заполнить и сохранить Telegram', async () => {
      await profilePage.profileTelegramInput.fill(telegramName);
      await profilePage.profileSaveButton.click();
    });

    await test.step('Проверить отображение Telegram', async () => {
      await expect(profilePage.profileTelegramInput).toHaveValue(telegramName);
    });
  });

  // Тест №3
  test('Тест №3: Изменение часового пояса в профиле', async ({ page }) => {
    const timezoneIrkutsk = 'Asia/Irkutsk';

    await test.step('Выбрать и сохранить часовой пояс', async () => {
      await profilePage.profileTimezoneSelect.selectOption(timezoneIrkutsk);
      await profilePage.profileSaveButton.click();
    });
    await test.step('Проверить выбранный часовой пояс', async () => {
      await expect(profilePage.profileTimezoneSelect).toHaveValue(timezoneIrkutsk);
    });
  });

  // Тест №4
  test('Тест №4: Изменение описания о себе в профиле', async ({ page }) => {
    const aboutText = `About me ${Date.now()}`;

    await test.step('Заполнить поле "О себе" и сохранить', async () => {
      await profilePage.profileAboutInput.fill(aboutText);
      await profilePage.profileSaveButton.click();
    });

    await test.step('Проверить текст в поле "О себе"', async () => {
      await expect(profilePage.profileAboutInput).toHaveValue(aboutText);
    });
  });

  // Тест №5
  test('Тест №5: Добавление навыка в профиле', async ({ page }) => {
    await test.step('Заполнить форму и добавить навык', async () => {
      await profilePage.profileSkillInput.fill(skillTag);
      await profilePage.profileSkillTypeSelect.selectOption({ label: 'Хочу разобрать' });
      await profilePage.profileSkillSubmit.click();
    });

    await test.step('Проверить появление тега навыка', async () => {
      await expect(profilePage.getProfileSkillTagByName(skillTag)).toBeVisible();
    });
  });

  // Тест №6
  test('Тест №6: Удаление навыка из профиля', async ({ page }) => {
    await test.step('Добавить навык', async () => {
      await profilePage.profileSkillInput.fill(skillTag);
      await profilePage.profileSkillTypeSelect.selectOption({ label: 'Хочу разобрать' });
      await profilePage.profileSkillSubmit.click();
    });

    await test.step('Удалить добавленный навык', async () => {
      await profilePage.profileSkillDrop.click();
    });

    await test.step('Проверить, что кнопка удаления больше не видна', async () => {
      await expect(profilePage.profileSkillDrop).not.toBeVisible();
    });
  });

  // Тест №7
  test('Тест №7: Добавление нескольких навыков', async ({ page }) => {
    const skillTag1 = `${skillTag}-1`;
    const skillTag2 = `${skillTag}-2`;
    const skillTag3 = `${skillTag}-3`;

    await test.step('Заполнить форму и добавить 3 навыка', async () => {
      await profilePage.profileSkillInput.fill(skillTag1);
      await profilePage.profileSkillTypeSelect.selectOption({ label: 'Хочу разобрать' });
      await profilePage.profileSkillSubmit.click();
      await expect(profilePage.getProfileSkillTagByName(skillTag1)).toBeVisible();

      await profilePage.profileSkillInput.fill(skillTag2);
      await profilePage.profileSkillTypeSelect.selectOption({ label: 'Хочу разобрать' });
      await profilePage.profileSkillSubmit.click();
      await expect(profilePage.getProfileSkillTagByName(skillTag2)).toBeVisible();

      await profilePage.profileSkillInput.fill(skillTag3);
      await profilePage.profileSkillTypeSelect.selectOption({ label: 'Хочу разобрать' });
      await profilePage.profileSkillSubmit.click();
      await expect(profilePage.getProfileSkillTagByName(skillTag3)).toBeVisible();
    });

    await test.step('Проверить, что на странице отображаются ровно 3 тега навыков', async () => {
      await expect(profilePage.profileSkillTags).toHaveCount(3);
    });
  });

  // Тест №8
  test('Тест №8: Очистка поля ввода навыка после добавления', async ({ page }) => {
    await test.step('Заполнить и добавить навык', async () => {
      await profilePage.profileSkillInput.fill(skillTag);
      await profilePage.profileSkillTypeSelect.selectOption({ label: 'Хочу разобрать' });
      await profilePage.profileSkillSubmit.click();
    });

    await test.step('Дождаться появления тега в UI', async () => {
      await expect(profilePage.getProfileSkillTagByName(skillTag)).toBeVisible();
    });

    await test.step('Проверить, что инпут ввода навыка снова пуст', async () => {
      await expect(profilePage.profileSkillInput).toHaveValue('');
    });
  });
});
