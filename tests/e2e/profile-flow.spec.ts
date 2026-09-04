import { test, expect } from "@playwright/test";
import { makeUser, registerUser } from "../helpers/user";
import { ProfilePage } from "../pages/profile-page";


test.describe("Профиль: действия с полями", () => {
  let profilePage: ProfilePage;

  test.beforeEach(async ({ page }) => {
    profilePage = new ProfilePage(page);
    const user = makeUser("hw8", Date.now());
    await registerUser(page, user);
    await profilePage.goto();
  });

  test("Изменить имя", async () => {
    const newName = `Тимур Тестович ${Date.now()}`;

    await test.step("Ввести новое значение и сохранить", async () => {
      await profilePage.fillName(newName);
      await profilePage.saveProfile();
    });

    await test.step("После перезагрузки с сервера пришло введенное значение", async () => {
      await profilePage.reload();
      await expect(profilePage.profileNameInput).toHaveValue(newName);
    });
  });

  test("Изменить часовой пояс", async () => {
    // По умолчанию стоит Europe/Moscow — берём заведомо другой,
    // иначе проверка прошла бы и без всякого выбора.
    const timezone = "Asia/Yekaterinburg";

    await test.step("Выбрать другой часовой пояс и сохранить", async () => {
      await profilePage.changeTimezone(timezone);
      await profilePage.saveProfile();
    });

    await test.step("После перезагрузки выбран новый пояс", async () => {
      await profilePage.reload();
      await expect(profilePage.profileTimezoneSelect).toHaveValue(timezone);
    });
  });

  test("Изменить Telegram", async () => {
    const telegram = `@qa_timur_cat${Date.now()}`;

    await test.step("Ввести новое значение и сохранить", async () => {
      await profilePage.fillTelegram(telegram);
      await profilePage.saveProfile();
    });

    await test.step("После перезагрузки с сервера пришёл введенный Telegram", async () => {
      await profilePage.reload();
      await expect(profilePage.profileTelegramInput).toHaveValue(telegram);
    });
  });

  test("Изменить «О себе»", async () => {
    const bio = `QA-инженер, прогон ${Date.now()}. Пытаюсь разобраться в Playwright.`;

    await test.step("Ввести новое значение и сохранить", async () => {
      await profilePage.fillBio(bio);
      await profilePage.saveProfile();
    });

    await test.step("После перезагрузки с сервера пришли введенные данные", async () => {
      await profilePage.reload();
      await expect(profilePage.profileBioInput).toHaveValue(bio);
    });
  });

  test("Добавить навык в блок «могу помочь»", async () => {
    const skillTag = `Playwright-demo-${Date.now()}`;

    await test.step("Добавить навык", async () => {
      await profilePage.addSkill(skillTag, "can_help");
    });

    await test.step("Проверить, что навык появился в блоке", async () => {
      await expect(profilePage.canHelpSkills).toContainText(skillTag);
    });
  });

  test("Негатив: добавить пустой навык", async () => {
    await test.step("Нажать на кнопку «Добавить», не заполнив поле", async () => {
      await expect(profilePage.skillInput).toHaveValue("");
      await profilePage.addSkillButton.click();
    });

    await test.step("Проверить, что навык не добавился", async () => {
      // Поле навыка помечено required — браузер не даёт отправить форму.
      // Проверяем именно результат: чипов ноль и блока «могу помочь» нет,
      // а не «клик прошёл и ладно».
      await expect(profilePage.skillChips).toHaveCount(0);
      await expect(profilePage.canHelpSkills).toBeHidden();
    });
  });

  test("Негатив: навык «хочу разобрать» не попадает в блок «могу помочь»", async () => {
    const runId = Date.now();
    const canHelpTag = `CanHelp-${runId}`;
    const wantToLearnTag = `WantToLearn-${runId}`;

    await test.step("Добавляем навык «могу помочь»", async () => {
      await profilePage.addSkill(canHelpTag, "can_help");
      await expect(profilePage.skillChip(canHelpTag)).toBeVisible();
    });

    await test.step("Добавляем навык «хочу разобрать»", async () => {
      await profilePage.addSkill(wantToLearnTag, "want_to_learn");
      await expect(profilePage.skillChip(wantToLearnTag)).toBeVisible();
    });

    await test.step("Навыки появились в своих блоках", async () => {
      await expect(profilePage.skillChips).toHaveCount(2);
      await expect(profilePage.canHelpSkills).toContainText(canHelpTag);
      // Главная проверка теста: второй навык добавлен, но в «могу помочь» его нет.
      await expect(profilePage.canHelpSkills).not.toContainText(wantToLearnTag);
    });
  });

  test("Форма профиля: проверить сохранение трёх текстовых полей", async () => {
    const runId = Date.now();
    const name = `Тимур Тестовый ${runId}`;
    const telegram = `@qa_timur_${runId}`;
    const bio = `QA-инженер, прогон ${runId}. Проверяю форму профиля целиком.`;

    await test.step("Заполнить Имя, Telegram и «О себе» и сохранить", async () => {
      await profilePage.fillName(name);
      await profilePage.fillTelegram(telegram);
      await profilePage.fillBio(bio);
      await profilePage.saveProfile();
    });

    await test.step("После перезагрузки с сервера пришли введенные данные", async () => {
      await profilePage.reload();
      // expect.soft не останавливает тест на первой неудаче: если поедут
      // два поля из трёх, увидим оба сразу, а не по одному за прогон.
      await expect.soft(profilePage.profileNameInput).toHaveValue(name);
      await expect.soft(profilePage.profileTelegramInput).toHaveValue(telegram);
      await expect.soft(profilePage.profileBioInput).toHaveValue(bio);
    });
  });
});
