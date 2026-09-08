import { test, expect, type Page } from "@playwright/test";
import { ROUTES, makeUser, registerUser } from "./helpers/registerUser";
import { ProfilePage } from "./pages/profile-page"; 



test.describe("Профиль: действия с полями", () => {
  
  let profile: ProfilePage;
  test.beforeEach(async ({ page }) => {
    const user = makeUser("hw8", Date.now());
    await registerUser(page, user);
    profile = new ProfilePage(page);
    await profile.open();
  });

  test("Изменение имени в профиле", async ({ page }) => {
    const newName = `Тимур Тестович ${Date.now()}`;

    await test.step("Заполняем поле и сохраняем", async () => {
      await profile.profileNameInput.fill(newName);
      await profile.saveProfile();
    });

    await test.step("После перезагрузки имя пришло с сервера", async () => {
      await profile.reload();
      await expect(profile.profileNameInput).toHaveValue(newName);
    });
  });

  test("Изменение часового пояса в профиле", async ({ page }) => {
    const timezone = "Asia/Yekaterinburg";

    await test.step("Выбираем часовой пояс и сохраняем", async () => {
      await expect(profile.profileTimezoneSelect).toHaveValue("Europe/Moscow");
      await profile.profileTimezoneSelect.selectOption(timezone);
      await profile.saveProfile();
    });

    await test.step("После перезагрузки выбран новый часовой пояс", async () => {
      await profile.reload();
      await expect(profile.profileTimezoneSelect).toHaveValue(timezone);
    });
  });

  test("Заполнение пустого поля Telegram", async ({ page }) => {
    const telegram = `@qa_timur_cat${Date.now()}`;
    
    await test.step("Заполняем поле Telegram и сохраняем", async () => {
      await expect(profile.profileTelegramInput).toHaveValue("");
      await profile.profileTelegramInput.fill(telegram);
      await profile.saveProfile();
    });

    await test.step("После перезагрузки Telegram пришёл с сервера", async () => {
      await profile.reload();
      await expect(profile.profileTelegramInput).toHaveValue(telegram); 
    });
  });

  test("Заполнение многострочного поля О себе", async ({ page }) => {
    const bio = `QA-инженер, прогон ${Date.now()}. Пытаюсь разобраться в Playwright.`;

    await test.step("Заполняем «О себе» и сохраняем", async () => {
      await profile.profileBioInput.fill(bio);
      await profile.saveProfile();
    });

    await test.step("После перезагрузки текст пришёл с сервера", async () => {
      await profile.reload();
      await expect(profile.profileBioInput).toHaveValue(bio); 
    });
  });

  test("Добавление навыка в раздел 'Могу помочь'", async ({ page }) => {
    const skillTag = `Playwright-demo-${Date.now()}`;

    await test.step("Добавляем навык «могу помочь»", async () => {
      await profile.addSkill(skillTag, "can_help");
    });

    await test.step("Навык появился в блоке «могу помочь»", async () => {
      await expect(profile.canHelpSkills).toContainText(skillTag);
    });
  });

  test("Негатив: пустой навык не добавляется", async ({ page }) => {
    
    await test.step("Жмём «Добавить», не заполнив поле", async () => {
      await expect(profile.skillInput).toHaveValue("");
      await profile.addSkillButton.click(); 
    });

    await test.step("Ни одного навыка не появилось", async () => {
      await expect(profile.skillChips).toHaveCount(0);
      await expect(profile.canHelpSkills).not.toBeVisible();
    });
  });

  test("Негатив: навык «хочу разобрать» не попадает в блок «могу помочь»", async ({ page }) => {
    const runId = Date.now();
    const canHelpTag = `CanHelp-${runId}`;
    const wantToLearnTag = `WantToLearn-${runId}`;

    await test.step("Добавляем навык «могу помочь»", async () => {
      await profile.addSkill(canHelpTag, "can_help");
      await expect(profile.skillChip(canHelpTag)).toBeVisible();
    });

    await test.step("Добавляем навык «хочу разобрать»", async () => {
      await profile.addSkill(wantToLearnTag, "want_to_learn");
      await expect(profile.skillChip(wantToLearnTag)).toBeVisible();
    });

    await test.step("Навыки разошлись по своим блокам", async () => {
      await expect(profile.skillChips).toHaveCount(2);
      await expect(profile.canHelpSkills).toContainText(canHelpTag);
      await expect(profile.canHelpSkills).not.toContainText(wantToLearnTag);
    });
  });

  test("Форма профиля: три поля сохраняются за один раз", async ({ page }) => {
    const runId = Date.now();
    const name = `Тимур Тестовый ${runId}`;
    const telegram = `@qa_timur_${runId}`;
    const bio = `QA-инженер, прогон ${runId}. Проверяю форму профиля целиком.`;

    await test.step("Заполняем Имя, Telegram и «О себе», сохраняем разом", async () => {
      await profile.profileNameInput.fill(name);
      await profile.profileTelegramInput.fill(telegram);
      await profile.profileBioInput.fill(bio);
      await profile.saveProfile();
    });

    await test.step("После перезагрузки все три значения пришли с сервера", async () => {
      await profile.reload();
      
      await expect.soft(profile.profileNameInput).toHaveValue(name);
      await expect.soft(profile.profileTelegramInput).toHaveValue(telegram);
      await expect.soft(profile.profileBioInput).toHaveValue(bio);
    });
  });
});
