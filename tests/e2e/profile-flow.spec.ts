import { test, expect } from "@playwright/test";
import { makeUser, registerUser, type TestUser } from "../helpers/user";
import { ProfilePage } from "../pages/profile-page";

test.describe("Профиль: действия с полями", () => {
  let profile: ProfilePage;

  test.beforeEach(async ({ page }) => {
    const user: TestUser = makeUser("hw8", Date.now());
    await registerUser(page, user);
    profile = new ProfilePage(page);
    await profile.goto();
  });

  test("имя: вводим новое и сохраняем", async ({ page }) => {
    const newName = `Тимур Тестович ${Date.now()}`;

    await test.step("Заполняем поле и сохраняем", async () => {
      await profile.nameInput.fill(newName);
      await profile.save();
    });

    await test.step("После перезагрузки имя пришло с сервера", async () => {
      await profile.reload();
      await expect(profile.nameInput).toHaveValue(newName);
    });
  });

  test("часовой пояс: выбираем из списка", async ({ page }) => {
    const timezone = "Asia/Yekaterinburg";

    await test.step("Выбираем часовой пояс и сохраняем", async () => {
      await expect(profile.timezoneSelect).toHaveValue("Europe/Moscow");
      await profile.timezoneSelect.selectOption(timezone);
      await profile.save();
    });

    await test.step("После перезагрузки выбран новый пояс", async () => {
      await profile.reload();
      await expect(profile.timezoneSelect).toHaveValue(timezone);
    });
  });

  test("telegram: заполняем пустое поле", async ({ page }) => {
    const telegram = `@qa_timur_cat${Date.now()}`;

    await test.step("Заполняем Telegram и сохраняем", async () => {
      await expect(profile.telegramInput).toHaveValue("");
      await profile.telegramInput.fill(telegram);
      await profile.save();
    });

    await test.step("После перезагрузки Telegram пришёл с сервера", async () => {
      await profile.reload();
      await expect(profile.telegramInput).toHaveValue(telegram);
    });
  });

  test("о себе: заполняем многострочное поле", async ({ page }) => {
    const bio = `QA-инженер, прогон ${Date.now()}. Пытаюсь разобраться в Playwright.`;

    await test.step("Заполняем «О себе» и сохраняем", async () => {
      await profile.bioInput.fill(bio);
      await profile.save();
    });

    await test.step("После перезагрузки текст пришёл с сервера", async () => {
      await profile.reload();
      await expect(profile.bioInput).toHaveValue(bio);
    });
  });

  test("навык: заполняем, выбираем тип и добавляем", async ({ page }) => {
    const skillTag = `Playwright-demo-${Date.now()}`;

    await test.step("Добавляем навык «могу помочь»", async () => {
      await profile.addSkill(skillTag, "can_help");
    });

    await test.step("Навык появился в блоке «могу помочь»", async () => {
      await expect(profile.canHelpSkills).toContainText(skillTag);
    });
  });

  test("негатив: пустой навык не добавляется", async ({ page }) => {
    await test.step("Жмём «Добавить», не заполнив поле", async () => {
      await expect(profile.skillInput).toHaveValue("");
      await profile.addSkill("");
    });

    await test.step("Ни одного навыка не появилось", async () => {
      await expect(profile.skillChips).toHaveCount(0);
      await expect(profile.canHelpSkills).toBeHidden();
    });
  });

  test("негатив: навык «хочу разобрать» не попадает в блок «могу помочь»", async ({
    page,
  }) => {
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

  test("форма профиля: три поля сохраняются за один раз", async ({ page }) => {
    const runId = Date.now();
    const name = `Тимур Тестовый ${runId}`;
    const telegram = `@qa_timur_${runId}`;
    const bio = `QA-инженер, прогон ${runId}. Проверяю форму профиля целиком.`;

    await test.step("Заполняем Имя, Telegram и «О себе», сохраняем разом", async () => {
      await profile.nameInput.fill(name);
      await profile.telegramInput.fill(telegram);
      await profile.bioInput.fill(bio);
      await profile.save();
    });

    await test.step("После перезагрузки все три значения пришли с сервера", async () => {
      await profile.reload();

      await expect.soft(profile.nameInput).toHaveValue(name);
      await expect.soft(profile.telegramInput).toHaveValue(telegram);
      await expect.soft(profile.bioInput).toHaveValue(bio);
    });
  });
});
