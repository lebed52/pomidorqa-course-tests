import { test, expect } from "@playwright/test";
import { makeUser, registerUser } from "../helpers/user";
import { ProfilePage } from "../pages/profile-page";

// ИСПРАВЛЕНО: единый таймаут для проверок "после reload" — на живом стенде
// (aiqa.su, не мок) GET профиля может отвечать медленнее, чем дефолтные 5s
// у expect(). Не поднимаем глобальный expect.timeout в конфиге, чтобы не
// маскировать реальные баги в других, более быстрых, проверках — задаём
// точечно там, где это оправдано.
const AFTER_RELOAD_TIMEOUT = 15_000;

test.describe("Профиль: действия с полями", () => {
  let profilePage: ProfilePage;

  test.beforeEach(async ({ page }) => {
    profilePage = new ProfilePage(page);
    const user = makeUser("hw10", Date.now());
    await registerUser(page, user);
    await profilePage.goto();
  });

  test("имя: вводим новое и сохраняем", async () => {
    const user = makeUser("name", Date.now());

    await test.step("Заполняем поле и сохраняем", async () => {
      await profilePage.saveName(user.newName);
    });
    await test.step("После перезагрузки имя сохранено", async () => {
      // ИСПРАВЛЕНО: reload + toHaveValue обёрнуты в toPass — если сразу
      // после reload страница ещё не подтянула значение с сервера, retry
      // сделает повторный reload вместо падения теста.
      await expect(async () => {
        await profilePage.page.reload();
        await expect(profilePage.nameInput).toHaveValue(user.newName, {
          timeout: 3_000,
        });
      }).toPass({ timeout: AFTER_RELOAD_TIMEOUT });
    });
  });

  test("часовой пояс: выбираем из списка", async () => {
    const user = makeUser("timezone", Date.now());

    await expect(profilePage.timezoneSelect).toHaveValue(user.timezone);

    await test.step("Выбираем новый часовой пояс и сохраняем", async () => {
      await profilePage.saveTimezone(user.newTimezone);
    });
    await test.step("После перезагрузки часовой пояс сохранён", async () => {
      await expect(async () => {
        await profilePage.page.reload();
        await expect(profilePage.timezoneSelect).toHaveValue(user.newTimezone, {
          timeout: 3_000,
        });
      }).toPass({ timeout: AFTER_RELOAD_TIMEOUT });
    });
  });

  test("telegram: заполняем пустое поле", async () => {
    const user = makeUser("telegram", Date.now());

    await test.step("Заполняем Telegram и сохраняем", async () => {
      await expect(profilePage.telegramInput).toHaveValue("");
      await profilePage.saveTelegram(user.newTelegram);
    });
    await test.step("После перезагрузки Telegram сохранён", async () => {
      await expect(async () => {
        await profilePage.page.reload();
        await expect(profilePage.telegramInput).toHaveValue(user.newTelegram, {
          timeout: 3_000,
        });
      }).toPass({ timeout: AFTER_RELOAD_TIMEOUT });
    });
  });

  test("о себе: заполняем многострочное поле", async () => {
    const user = makeUser("bio", Date.now());

    await test.step("Заполняем «О себе» и сохраняем", async () => {
      await profilePage.saveBio(user.newBio);
    });
    await test.step("После перезагрузки текст сохранён", async () => {
      await expect(async () => {
        await profilePage.page.reload();
        await expect(profilePage.bioInput).toHaveValue(user.newBio, {
          timeout: 3_000,
        });
      }).toPass({ timeout: AFTER_RELOAD_TIMEOUT });
    });
  });

  test("навык: заполняем, выбираем тип и добавляем", async () => {
    const skillTag = `Playwright-${Date.now()}`;

    await test.step("Добавляем навык типа «могу помочь»", async () => {
      await profilePage.addSkill(skillTag, "can_help");
    });
    await test.step("Навык появился в блоке «Могу помочь»", async () => {
      await expect(profilePage.canHelpSkills).toContainText(skillTag, {
        timeout: 10_000,
      });
    });
  });

  test("негатив: пустой навык не добавляется", async () => {
    await expect(profilePage.skillInput).toHaveValue("");

    await test.step("Пробуем добавить пустой навык", async () => {
      await profilePage.addSkill("", "can_help");
    });
    await test.step("Пустой навык не появился в списке", async () => {
      await expect(profilePage.skillChips).toHaveCount(0);
      await expect(profilePage.canHelpSkills).toBeHidden();
    });
  });

  test("негатив: навык «хочу разобрать» не попадает в блок «могу помочь»", async () => {
    const canHelpTag = `CanHelp-${Date.now()}`;
    const wantToLearnTag = `WantToLearn-${Date.now()}`;

    await test.step("Добавляем навыки разных типов", async () => {
      await profilePage.addSkill(canHelpTag, "can_help");
      await profilePage.addSkill(wantToLearnTag, "want_to_learn");
    });
    await test.step("«Хочу разобрать» не попадает в блок «могу помочь»", async () => {
      await expect(profilePage.skillChips).toHaveCount(2, { timeout: 10_000 });
      await expect(profilePage.canHelpSkills).toContainText(canHelpTag);
      await expect(profilePage.canHelpSkills).not.toContainText(wantToLearnTag);
    });
  });

  test("форма профиля: три поля сохраняются за один раз", async () => {
    const user = makeUser("form", Date.now());

    await test.step("Заполняем Имя, Telegram и «О себе», сохраняем разом", async () => {
      await profilePage.nameInput.fill(user.newName);
      await profilePage.telegramInput.fill(user.newTelegram);
      await profilePage.bioInput.fill(user.newBio);
      await profilePage.saveProfile();
    });
    await test.step("После перезагрузки все три значения пришли с сервера", async () => {
      // ВАЖНО: expect.soft НЕ бросает исключение при неудаче — это ломает
      // toPass(), который узнаёт о необходимости повторить попытку именно
      // по брошенной ошибке. Соединять toPass() (retry от гонки) и
      // expect.soft (агрегация всех несовпадений) в одном callback нельзя:
      // первая же гонка "прошла бы" как успех, а retry так и не случился бы.
      // Поэтому внутри retry используем обычный (жёсткий) expect —
      // это отдаёт приоритет реальной защите от гонки перед удобством
      // видеть все три расхождения разом.
      await expect(async () => {
        await profilePage.page.reload();
        await expect(profilePage.nameInput).toHaveValue(user.newName, { timeout: 3_000 });
        await expect(profilePage.telegramInput).toHaveValue(user.newTelegram, { timeout: 3_000 });
        await expect(profilePage.bioInput).toHaveValue(user.newBio, { timeout: 3_000 });
      }).toPass({ timeout: AFTER_RELOAD_TIMEOUT });
    });
  });
});