import { test, expect } from "@playwright/test";
import { makeUser, ROUTES } from "../helpers/user";
import { ProfilePage } from "../pages/profile-page";

test.describe("Профиль: действия с полями", () => {
  let profile: ProfilePage;

  // Пользователь заводится через API: форму регистрации проверяет отдельный
  // тест, здесь нужен только сам факт «участник есть и он вошёл». Кука из
  // ответа ложится в контекст страницы, поэтому профиль открывается сразу.
  test.beforeEach(async ({ page }) => {
    const user = makeUser("hw14", Date.now());
    const created = await page.context().request.post(ROUTES.accounts, { data: user });
    if (created.status() !== 201) {
      throw new Error(`Создание ${user.email} не удалось: ${created.status()}`);
    }
    profile = new ProfilePage(page);
    await profile.open();
  });

  // Контекст здесь свой у каждого теста и закрывает его Playwright — нам
  // остаётся убрать сам аккаунт, иначе он копится на общем стенде.
  test.afterEach(async ({ page }) => {
    const deleted = await page.context().request.delete(ROUTES.accounts);
    if (deleted.status() !== 200) {
      throw new Error(`Удаление аккаунта не удалось: ${deleted.status()}`);
    }
  });

  test("имя сохраняется и приходит с сервера после перезагрузки", async () => {
    const newName = `Тимур Тестович ${Date.now()}`;

    await test.step("Заполняем поле и сохраняем", async () => {
      await profile.nameInput.fill(newName);
      await profile.save();
    });

    await test.step("Перезагружаем страницу", async () => {
      await profile.reload();
    });

    await test.step("После перезагрузки имя пришло с сервера", async () => {
      await expect(profile.nameInput).toHaveValue(newName);
    });
  });

  test("часовой пояс сохраняется после перезагрузки", async () => {
    const timezone = "Asia/Yekaterinburg";

    await test.step("В профиле стоит пояс по умолчанию", async () => {
      await expect(profile.timezoneSelect).toHaveValue("Europe/Moscow");
    });

    await test.step("Выбираем другой часовой пояс и сохраняем", async () => {
      await profile.timezoneSelect.selectOption(timezone);
      await profile.save();
    });

    await test.step("Перезагружаем страницу", async () => {
      await profile.reload();
    });

    await test.step("После перезагрузки выбран новый пояс", async () => {
      await expect(profile.timezoneSelect).toHaveValue(timezone);
    });
  });

  test("telegram сохраняется после перезагрузки", async () => {
    const telegram = `@qa_timur_cat${Date.now()}`;

    await test.step("Поле Telegram у нового участника пустое", async () => {
      await expect(profile.telegramInput).toHaveValue("");
    });

    await test.step("Заполняем Telegram и сохраняем", async () => {
      await profile.telegramInput.fill(telegram);
      await profile.save();
    });

    await test.step("Перезагружаем страницу", async () => {
      await profile.reload();
    });

    await test.step("После перезагрузки Telegram пришёл с сервера", async () => {
      await expect(profile.telegramInput).toHaveValue(telegram);
    });
  });

  test("«О себе» сохраняется после перезагрузки", async () => {
    const bio = `QA-инженер, прогон ${Date.now()}. Пытаюсь разобраться в Playwright.`;

    await test.step("Заполняем «О себе» и сохраняем", async () => {
      await profile.bioInput.fill(bio);
      await profile.save();
    });

    await test.step("Перезагружаем страницу", async () => {
      await profile.reload();
    });

    await test.step("После перезагрузки текст пришёл с сервера", async () => {
      await expect(profile.bioInput).toHaveValue(bio);
    });
  });

  test("навык «могу помочь» попадает в свой блок", async () => {
    const skillTag = `Playwright-demo-${Date.now()}`;

    await test.step("Добавляем навык «могу помочь»", async () => {
      await profile.addSkill(skillTag, "can_help");
    });

    await test.step("Навык появился в блоке «могу помочь»", async () => {
      await expect(profile.canHelpSkills).toContainText(skillTag);
    });
  });

  test("негатив: пустой навык не добавляется", async () => {
    await test.step("Поле навыка пустое", async () => {
      await expect(profile.skillInput).toHaveValue("");
    });

    await test.step("Жмём «Добавить», не заполнив поле", async () => {
      await profile.addSkillButton.click();
    });

    await test.step("Ни одного навыка не появилось", async () => {
      await expect(profile.skillChips).toHaveCount(0);
      await expect(profile.canHelpSkills).toBeHidden();
    });

    // Ноль сам по себе ничего не доказывает: он бы прошёл и на мёртвой форме.
    // Добавляем настоящий навык — если он появился, значит форма была живая,
    // а пустую заявку она отклонила осознанно.
    await test.step("Добавляем настоящий навык той же формой", async () => {
      await profile.addSkill(`Playwright-control-${Date.now()}`, "can_help");
    });

    await test.step("Форма живая — навык добавился", async () => {
      await expect(profile.skillChips).toHaveCount(1);
    });
  });

  test("негатив: навык «хочу разобрать» не попадает в блок «могу помочь»", async () => {
    const runId = Date.now();
    const canHelpTag = `CanHelp-${runId}`;
    const wantToLearnTag = `WantToLearn-${runId}`;

    await test.step("Добавляем навык «могу помочь»", async () => {
      await profile.addSkill(canHelpTag, "can_help");
    });

    await test.step("Первый навык появился", async () => {
      await expect(profile.skillChip(canHelpTag)).toBeVisible();
    });

    await test.step("Добавляем навык «хочу разобрать»", async () => {
      await profile.addSkill(wantToLearnTag, "want_to_learn");
    });

    await test.step("Второй навык появился", async () => {
      await expect(profile.skillChip(wantToLearnTag)).toBeVisible();
    });

    await test.step("Навыки разошлись по своим блокам", async () => {
      await expect(profile.skillChips).toHaveCount(2);
      await expect(profile.canHelpSkills).toContainText(canHelpTag);
      await expect(profile.canHelpSkills).not.toContainText(wantToLearnTag);
    });
  });

  test("форма профиля: три поля сохраняются за один раз", async () => {
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

    await test.step("Перезагружаем страницу", async () => {
      await profile.reload();
    });

    await test.step("После перезагрузки все три значения пришли с сервера", async () => {
      await expect.soft(profile.nameInput).toHaveValue(name);
      await expect.soft(profile.telegramInput).toHaveValue(telegram);
      await expect.soft(profile.bioInput).toHaveValue(bio);
    });
  });
});
