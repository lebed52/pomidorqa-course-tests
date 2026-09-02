import { test, expect} from "@playwright/test";
import {ProfilePage} from "../pages/ProfilePage";
import {makeUser,registerUser, ROUTES} from "../helpers/user";


test.describe("Профиль: действия с полями", () => {
  let profilePage : ProfilePage;

  test.beforeEach(async ({ page }) => {
    const user = makeUser("hw8", Date.now());
    profilePage = new ProfilePage(page);

    await registerUser(page, user);
    await profilePage.gotoProfile();
  });

  test("имя: вводим новое и сохраняем", async ({ page }) => {
    const newName = `Тимур Тестович ${Date.now()}`;

    await test.step("Заполняем поле и сохраняем", async () => {
      await profilePage.profileNameInput.fill(newName);
      await profilePage.saveProfile();
    });

    await test.step("После перезагрузки имя пришло с сервера", async () => {
      await page.reload();
      await expect(profilePage.profileNameInput).toHaveValue(newName);
    });
  });

  test("часовой пояс: выбираем из списка", async ({ page }) => {
    const timezone = "Asia/Yekaterinburg";

    await test.step("Выбираем часовой пояс и сохраняем", async () => {
      await profilePage.profileTimezoneSelect.selectOption(timezone);
      await profilePage.saveProfile();
    });

    await test.step("После перезагрузки выбран новый пояс", async () => {
      await page.reload();
      await expect(profilePage.profileTimezoneSelect).toHaveValue(timezone);
    });
  });

  test("telegram: заполняем пустое поле", async ({ page }) => {
    const telegram = `@qa_timur_cat${Date.now()}`;

    await test.step("Заполняем Telegram и сохраняем", async () => {
      await profilePage.profileTelegramInput.fill(telegram);
      await profilePage.saveProfile();
    });

    await test.step("После перезагрузки Telegram пришёл с сервера", async () => {
      await page.reload();
      await expect(profilePage.profileTelegramInput).toHaveValue(telegram);
    });
  });

  test("о себе: заполняем многострочное поле", async ({ page }) => {
    const bio = `QA-инженер, прогон ${Date.now()}. Пытаюсь разобраться в Playwright.`;

    await test.step("Заполняем «О себе» и сохраняем", async () => {
      await profilePage.profileBioInput.fill(bio);
      await profilePage.saveProfile();
    });

    await test.step("После перезагрузки текст пришёл с сервера", async () => {
      await page.reload();
      await expect(profilePage.profileBioInput).toHaveValue(bio);
    });
  });

  test("навык: заполняем, выбираем тип и добавляем", async () => {
    const skillTag = `Playwright-demo-${Date.now()}`;

    await test.step("Добавляем навык «могу помочь»", async () => {
      await profilePage.fillSkillInput(skillTag, "can_help");
    });

    await test.step("Навык появился в блоке «могу помочь»", async () => {
      await expect(profilePage.canHelpSkills).toContainText(skillTag);
    });
  });

  test("негатив: пустой навык не добавляется", async () => {
    await test.step("Жмём «Добавить», не заполнив поле", async () => {
      await profilePage.addSkillButton.click();
    });

    await test.step("Ни одного навыка не появилось", async () => {
      await expect(profilePage.skillChips).toHaveCount(0);
      await expect(profilePage.canHelpSkills).toBeHidden();
    });
  });

  test("негатив: навык «хочу разобрать» не попадает в блок «могу помочь»", async () => {
    const runId = Date.now();
    const canHelpTag = `CanHelp-${runId}`;
    const wantToLearnTag = `WantToLearn-${runId}`;

    await test.step("Добавляем навык «могу помочь»", async () => {
      await profilePage.fillSkillInput(canHelpTag, "can_help");

      await expect(profilePage.getSkillChip(canHelpTag)).toBeVisible();
    });

    await test.step("Добавляем навык «хочу разобрать»", async () => {
      await profilePage.fillSkillInput(wantToLearnTag, "want_to_learn");
    });

    await test.step("Навыки разошлись по своим блокам", async () => {
      await expect(profilePage.skillChips).toHaveCount(2);
      await expect(profilePage.canHelpSkills).toContainText(canHelpTag);
      await expect(profilePage.canHelpSkills).not.toContainText(wantToLearnTag);
    });
  });

  test("форма профиля: три поля сохраняются за один раз", async ({ page }) => {
    const runId = Date.now();
    const name = `Тимур Тестовый ${runId}`;
    const telegram = `@qa_timur_${runId}`;
    const bio = `QA-инженер, прогон ${runId}. Проверяю форму профиля целиком.`;

    await test.step("Заполняем Имя, Telegram и «О себе», сохраняем разом", async () => {
      await profilePage.fillAllPersonalInputs(name, telegram, bio);
      await profilePage.saveProfile();
    });

    await test.step("После перезагрузки все три значения пришли с сервера", async () => {
      await page.reload();

      await expect.soft(profilePage.profileNameInput).toHaveValue(name);
      await expect.soft(profilePage.profileTelegramInput).toHaveValue(telegram);
      await expect.soft(profilePage.profileBioInput).toHaveValue(bio);
    });
  });
});
