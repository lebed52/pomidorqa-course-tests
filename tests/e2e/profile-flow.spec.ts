import { test, expect } from "@playwright/test";
import { makeUser, registerUser } from "../helpers/user";
import { ProfilePage } from "../pages/profile-page";

test.describe("Профиль: действия с полями (Page Object)", () => {
  let profile: ProfilePage;

  test.beforeEach(async ({ page }) => {
    const user = makeUser("hw10");
    await registerUser(page, user);
    profile = new ProfilePage(page);
    await profile.goto();
  });

  test("позитив: три поля профиля сохраняются одновременно", async ({ page }) => {
    const name = `Тохиржон POM ${Date.now()}`;
    const telegram = `@qa_pom_${Date.now()}`;
    const bio = `Автоматизатор, POM рефакторинг ${Date.now()}`;

    await test.step("Заполняем Имя, Telegram, О себе и сохраняем", async () => {
      await profile.fillProfileForm(name, telegram, bio);
      await profile.saveProfile();
    });

    await test.step("После перезагрузки все значения пришли с сервера", async () => {
      await page.reload();
      await expect.soft(profile.nameInput).toHaveValue(name);
      await expect.soft(profile.telegramInput).toHaveValue(telegram);
      await expect.soft(profile.bioInput).toHaveValue(bio);
    });
  });

  test("позитив: часовой пояс успешно обновляется", async ({ page }) => {
    const newTimezone = "Asia/Yekaterinburg";

    await test.step("Выбираем часовой пояс из селектора", async () => {
      await profile.saveTimezone(newTimezone);
    });

    await test.step("Проверяем сохранение после обновления страницы", async () => {
      await page.reload();
      await expect(profile.timezoneSelect).toHaveValue(newTimezone);
    });
  });

  test("негатив: навык 'хочу разобрать' не дублируется в блок 'могу помочь'", async () => {
    const skillName = `WantToLearn-${Date.now()}`;

    await test.step("Добавляем навык в категорию 'хочу разобрать'", async () => {
      await profile.addSkill(skillName, "want_to_learn");
    });

    await test.step("Проверяем жесткую изоляцию блоков", async () => {
      await expect(profile.wantToLearnSkills).toContainText(skillName);
      await expect(profile.canHelpSkillItem(skillName)).toHaveCount(0);
    });
  });

  test("негатив: успешное удаление добавленного навыка", async () => {
    const skillName = `DeleteMe-${Date.now()}`;

    await test.step("Создаем навык-мишень", async () => {
      await profile.addSkill(skillName, "can_help");
      await expect(profile.canHelpSkills).toContainText(skillName);
    });

    await test.step("Кликаем по кнопке удаления (крестик) и проверяем DOM", async () => {
      await profile.removeSkill(skillName);
      await expect(profile.skillInput).toBeEmpty();
      await expect(profile.canHelpSkillItem(skillName)).toHaveCount(0);
    });
  });

  test("позитив: поле ввода очищается после успешного добавления", async () => {
    const skillTag = `Очистка-${Date.now()}`;
    
    await test.step("Добавляем навык", async () => {
      await profile.addSkill(skillTag, "can_help");
    });

    await test.step("Проверяем, что инпут пустой", async () => {
      await expect(profile.skillInput).toBeEmpty();
    });
  });

  test("негатив: добавленный навык встречается в списке ровно один раз", async () => {
    const skillTag = `Дубль-${Date.now()}`;
    
    await test.step("Добавляем навык", async () => {
      await profile.addSkill(skillTag, "can_help");
    });

    await test.step("Проверяем отсутствие дубликатов", async () => {
      await expect(profile.canHelpSkillItem(skillTag)).toHaveCount(1);
    });
  });
});