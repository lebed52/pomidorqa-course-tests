import { test, expect, type Page } from "@playwright/test";
import { makeUser, registerUser, ROUTES } from "../helpers/user";
import { ProfilePage } from "../pages/profile-page";




test.describe("Профиль: действия с полями", () => {
  let profilePage: ProfilePage;

  test.beforeEach(async ({ page }) => {
    const user = makeUser("hw10", Date.now());
    profilePage = new ProfilePage(page);
    await registerUser(page, user);
    await page.goto(ROUTES.profile);
  });

  test("имя: вводим новое и сохраняем", async ({ page }) => {
    const newName = `Тимур Тестович ${Date.now()}`;

    await test.step("Заполняем поле и сохраняем", async () => {
      await profilePage.nameInput.fill(newName);
      await profilePage.save();
    });

    await test.step("После перезагрузки имя пришло с сервера", async () => {
      await page.reload();
      await expect(profilePage.nameInput).toHaveValue(newName);
    });
  });

  test("часовой пояс: выбираем из списка", async ({ page }) => {
    // По умолчанию стоит Europe/Moscow — берём заведомо другой,
    // иначе проверка прошла бы и без всякого выбора.
    const timezone = "Asia/Yekaterinburg";

    await test.step("Выбираем часовой пояс и сохраняем", async () => {
      await expect(profilePage.timezoneSelect).toHaveValue("Europe/Moscow");
      await profilePage.timezoneSelect.selectOption(timezone);
      await profilePage.save();
    });

    await test.step("После перезагрузки выбран новый пояс", async () => {
      await page.reload();
      await expect(profilePage.timezoneSelect).toHaveValue(timezone);
    });
  });

  test("telegram: заполняем пустое поле", async ({ page }) => {
    const telegram = `@qa_timur_cat${Date.now()}`;

    await test.step("Заполняем Telegram и сохраняем", async () => {
      await expect(profilePage.telegramInput).toHaveValue("");
      await profilePage.telegramInput.fill(telegram);
      await profilePage.save();
    });

    await test.step("После перезагрузки Telegram пришёл с сервера", async () => {
      await page.reload();
      await expect(profilePage.telegramInput).toHaveValue(telegram);
    });
  });

  test("о себе: заполняем многострочное поле", async ({ page }) => {
    const bio = `QA-инженер, прогон ${Date.now()}. Пытаюсь разобраться в Playwright.`;

    await test.step("Заполняем «О себе» и сохраняем", async () => {
      await profilePage.bioInput.fill(bio);
      await profilePage.save();
    });

    await test.step("После перезагрузки текст пришёл с сервера", async () => {
      await page.reload();
      await expect(profilePage.bioInput).toHaveValue(bio);
    });
  });

  test("навык: заполняем, выбираем тип и добавляем", async ({ page }) => {
    const skillTag = `Playwright-demo-${Date.now()}`;

    // Комбо из трёх действий: ввод, выбор в списке, нажатие.
    // У этой формы своя кнопка «Добавить», к верхнему «Сохранить» она отношения не имеет.
    await test.step("Добавляем навык «могу помочь»", async () => {
      await profilePage.skillInput.fill(skillTag);
      await profilePage.skillTypeSelect.selectOption("can_help");
      await profilePage.addSkillButton.click();
    });

    await test.step("Навык появился в блоке «могу помочь»", async () => {
      await expect(profilePage.canHelpSkills).toContainText(skillTag);
    });
  });

  test("негатив: пустой навык не добавляется", async ({ page }) => {
    await test.step("Жмём «Добавить», не заполнив поле", async () => {
      await expect(profilePage.skillInput).toHaveValue("");
      await profilePage.addSkillButton.click();
    });

    await test.step("Ни одного навыка не появилось", async () => {
      // Поле навыка помечено required — браузер не даёт отправить форму.
      // Проверяем именно результат: чипов ноль и блока «могу помочь» нет,
      // а не «клик прошёл и ладно».
      await expect(profilePage.skillChips).toHaveCount(0);
      await expect(profilePage.canHelpSkills).not.toBeVisible();
    });
  });

  test("негатив: навык «хочу разобрать» не попадает в блок «могу помочь»", async ({ page }) => {
    const runId = Date.now();
    const canHelpTag = `CanHelp-${runId}`;
    const wantToLearnTag = `WantToLearn-${runId}`;

    await test.step("Добавляем навык «могу помочь»", async () => {
      await profilePage.skillInput.fill(canHelpTag);
      await profilePage.skillTypeSelect.selectOption("can_help");
      await profilePage.addSkillButton.click();
      await expect(profilePage.skillChip(canHelpTag)).toBeVisible();
    });

    await test.step("Добавляем навык «хочу разобрать»", async () => {
      await profilePage.skillInput.fill(wantToLearnTag);
      await profilePage.skillTypeSelect.selectOption("want_to_learn");
      await profilePage.addSkillButton.click();
      await expect(profilePage.skillChip(wantToLearnTag)).toBeVisible();
    });

    await test.step("Навыки разошлись по своим блокам", async () => {
      await expect(profilePage.skillChips).toHaveCount(2);
      await expect(profilePage.canHelpSkills).toContainText(canHelpTag);
      // Главная проверка теста: второй навык добавлен, но в «могу помочь» его нет.
      await expect(profilePage.canHelpSkills).not.toContainText(wantToLearnTag);
    });
  });

  test("форма профиля: три поля сохраняются за один раз", async ({ page }) => {
    const runId = Date.now();
    const name = `Тимур Тестовый ${runId}`;
    const telegram = `@qa_timur_${runId}`;
    const bio = `QA-инженер, прогон ${runId}. Проверяю форму профиля целиком.`;

    await test.step("Заполняем Имя, Telegram и «О себе», сохраняем разом", async () => {
      await profilePage.nameInput.fill(name);
      await profilePage.telegramInput.fill(telegram);
      await profilePage.bioInput.fill(bio);
      await profilePage.save();
    });

    await test.step("После перезагрузки все три значения пришли с сервера", async () => {
      await page.reload();
      // expect.soft не останавливает тест на первой неудаче: если поедут
      // два поля из трёх, увидим оба сразу, а не по одному за прогон.
      await expect.soft(profilePage.nameInput).toHaveValue(name);
      await expect.soft(profilePage.telegramInput).toHaveValue(telegram);
      await expect.soft(profilePage.bioInput).toHaveValue(bio);
    });
  });
});
