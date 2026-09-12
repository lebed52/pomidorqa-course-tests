import { test, expect } from "@playwright/test";
import { ProfilePage } from "../pages/ProfilePage";
import { timezones } from "../helpers/user";
import { makeUser, registerUserViaApi, deleteCurrentTestUser } from "../helpers/user";

test.describe("Профиль: действия с полями", () => {
  let profilePage: ProfilePage;
  
  test.beforeEach(async ({ page }) => {
    const user = makeUser("hw8", crypto.randomUUID().slice(0, 10));
    await registerUserViaApi(page, user);
    profilePage = new ProfilePage(page);
    await profilePage.goto();
  });

  test.afterEach(async ({ page }) => {
    await deleteCurrentTestUser(page);
  });

  test("имя: вводим новое и сохраняем", async ({ page }) => {
    const newName = `Тимур Тестович ${crypto.randomUUID().slice(0, 10)}`;

    await test.step("Заполняем поле и сохраняем", async () => {
      await profilePage.saveName(newName);
    });

    await test.step("После перезагрузки имя пришло с сервера", async () => {
      await page.reload();
      await expect(profilePage.nameInput).toHaveValue(newName);
    });
  });

  test("часовой пояс: выбираем из списка", async ({ page }) => {
    
    await test.step("Проверяем текущий часовой пояс перед изменением", async () => {
      await expect(profilePage.timezoneSelect).toHaveValue(timezones.MOSCOW);
    }); 

    await test.step("Выбираем часовой пояс и сохраняем", async () => {
      await profilePage.saveTimezone(timezones.EKATERINBURG);
    });

    await test.step("После перезагрузки выбран новый пояс", async () => {
      await page.reload();
      await expect(profilePage.timezoneSelect).toHaveValue(timezones.EKATERINBURG);
    });
  });

  test("telegram: заполняем пустое поле", async ({ page }) => {
    const telegram = `@qa_timur_cat${crypto.randomUUID().slice(0, 10)}`;

    await test.step("Проверяем, что поле Telegram было пустым перед вводом", async () => {
      await expect(profilePage.telegramInput).toHaveValue("");
    });

    await test.step("Заполняем Telegram и сохраняем", async () => {
      await profilePage.saveTelegram(telegram);
    });

    await test.step("После перезагрузки Telegram пришёл с сервера", async () => {
      await page.reload();
      await expect(profilePage.telegramInput).toHaveValue(telegram);
    });
  });

  test("о себе: заполняем многострочное поле", async ({ page }) => {
    const bio = `QA-инженер, прогон ${crypto.randomUUID().slice(0, 10)}. Пытаюсь разобраться в Playwright.`;

    await test.step("Заполняем «О себе» и сохраняем", async () => {
      await profilePage.saveBio(bio);
    });

    await test.step("После перезагрузки текст пришёл с сервера", async () => {
      await page.reload();
      await expect(profilePage.bioInput).toHaveValue(bio);
    });
  });

  test("навык: заполняем, выбираем тип и добавляем", async () => {
    const skillTag = `Playwright-demo-${crypto.randomUUID().slice(0, 10)}`;

    await test.step("Добавляем навык «могу помочь»", async () => {
      await profilePage.addSkill(skillTag, "can_help");
    });

    await test.step("Навык появился в блоке «могу помочь»", async () => {
      await expect(profilePage.canHelpSkills).toContainText(skillTag);
    });
  });

  test("негатив: пустой навык не добавляется", async () => {
    await test.step("Проверяем, что поле навыка пустое", async () => {
      await expect(profilePage.skillInput).toHaveValue("");
    });

    await test.step("Жмём «Добавить», не заполнив поле", async () => {
      await profilePage.addSkillButton.click();
    });

    await test.step("Ни одного навыка не появилось", async () => {
      await expect(profilePage.skillChips).toHaveCount(0);
      await expect(profilePage.canHelpSkills).toBeHidden();
    });
  });

  test("негатив: навык «хочу разобрать» не попадает в блок «могу помочь»", async () => {
    const runId = crypto.randomUUID().slice(0, 10);
    const canHelpTag = `CanHelp-${runId}`;
    const wantToLearnTag = `WantToLearn-${runId}`;

    await test.step("Добавляем навык «могу помочь»", async () => {
      await profilePage.addSkill(canHelpTag, "can_help");
    });

    await test.step("Проверяем, что навык «могу помочь» появился", async () => {
      await expect(profilePage.skillChip(canHelpTag, "can_help")).toBeVisible();
    });

    await test.step("Добавляем навык «хочу разобрать»", async () => {
      await profilePage.addSkill(wantToLearnTag, "want_to_learn");
    });

    await test.step("Проверяем, что навык «хочу разобрать» появился", async () => {
      await expect(profilePage.skillChip(wantToLearnTag, "want_to_learn")).toBeVisible();
    });

    await test.step("Навыки разошлись по своим блокам", async () => {
      await expect(profilePage.skillChips).toHaveCount(2);
      await expect(profilePage.canHelpSkills).toContainText(canHelpTag);
      await expect(profilePage.canHelpSkills).not.toContainText(wantToLearnTag);
    });
  });

  test("форма профиля: три поля сохраняются за один раз", async ({ page }) => {
    const runId = crypto.randomUUID().slice(0, 10);
    const name = `Тимур Тестовый ${runId}`;
    const telegram = `@qa_timur_${runId}`;
    const bio = `QA-инженер, прогон ${runId}. Проверяю форму профиля целиком.`;

    await test.step("Заполняем Имя, Telegram и «О себе», сохраняем разом", async () => {
      await profilePage.nameInput.fill(name);
      await profilePage.telegramInput.fill(telegram);
      await profilePage.bioInput.fill(bio);
      await profilePage.saveProfile(page, profilePage);
    });

    await test.step("После перезагрузки все три значения пришли с сервера", async () => {
      await page.reload();
      await expect.soft(profilePage.nameInput).toHaveValue(name);
      await expect.soft(profilePage.telegramInput).toHaveValue(telegram);
      await expect.soft(profilePage.bioInput).toHaveValue(bio);
    });
  });
});
