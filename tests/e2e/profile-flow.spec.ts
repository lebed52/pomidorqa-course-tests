import { test, expect } from "@playwright/test";
import { registerUser, makeUser, type TestUser } from "../helpers/user";
import { ProfilePage } from "../pages/profile-page";

test.describe("свой мир на каждый тест", () => {
  let profilePage: ProfilePage;
  let skillTag: string;
  let host: TestUser;

  test.beforeEach(async ({ page }) => {
    test.setTimeout(90_000);
    const runId = Date.now();
    
    skillTag = `Playwright-demo-${runId}`;
    host = makeUser("host", runId);
    
    profilePage = new ProfilePage(page);
    
    await test.step("Хост: регистрируется в PomidorQA", async () => {
      await registerUser(page, host);
    });
    
    await test.step("Хост: переходит на страницу профиля", async () => {
      await profilePage.goto();
    });
  });
  
  test("Смена имени в профиле", async ({ page }) => {
    await test.step("Хост: сохраняет новое имя в профиле", async () => {
        await profilePage.saveName(host.newName);
        await profilePage.saveProfile(page);
    });

    await test.step("Хост: перезагружает страницу", async () => {
      await page.reload();
    });

    await test.step("Хост: после reload проверяет имя с сервера", async () => {
      await expect(profilePage.nameInput).toHaveValue(host.newName);
    });
  });

  test("Добавление tg", async ({ page }) => {
    await test.step("Хост: сохраняет Telegram в профиле", async () => {
        await profilePage.saveTelegram(host.telegram);
        await profilePage.saveProfile(page);
        });

    await test.step("Хост: перезагружает страницу", async () => {
      await page.reload();
    });

    await test.step("Хост: после reload проверяет Telegram с сервера", async () => {
      await expect(profilePage.telegramInput).toHaveValue(host.telegram);
    });
  });

  test("Смена часового пояса", async ({ page }) => {
    await test.step("Хост: сохраняет часовой пояс", async () => {
        await profilePage.saveTimezone(host.timezone);
        await profilePage.saveProfile(page);
        });    

    await test.step("Хост: перезагружает страницу", async () => {
      await page.reload();
    });

    await test.step("Хост: после reload проверяет часовой пояс с сервера", async () => {
      await expect(profilePage.timezoneSelect).toHaveValue(host.timezone);
    });
  });

  test("Добавление инфо О себе", async ({ page }) => {
    await test.step("Хост: сохраняет текст «О себе»", async () => {
        await profilePage.saveBio(host.bio);
        await profilePage.saveProfile(page);
    });

    await test.step("Хост: перезагружает страницу", async () => {
      await page.reload();
    });

    await test.step("Хост: после reload проверяет текст «О себе» с сервера", async () => {
      await expect(profilePage.bioInput).toHaveValue(host.bio);
    });
  });

  test("Добавление навыка", async ({ page }) => {
    await test.step("Хост: добавляет навык «могу помочь»", async () => {
      await profilePage.addSkill(skillTag, "can_help");
    });

    await test.step("Хост: навык отобразился в блоке «Могу помочь»", async () => {
      await expect(profilePage.skillChips.filter({ hasText: skillTag })).toBeVisible();
    });
  });

  test("Негативный: сохранение профиля с пустым полем Имя", async ({ page }) => {
    await test.step("Хост: сохраняет профиль с пустым полем Имя", async () => {
      await profilePage.nameInput.clear();
      await profilePage.saveButton.click();
    });

    await test.step("Хост: перезагружает страницу профиля", async () => {
      await page.reload();
    });

    await test.step("Хост: проверяет, что поле Имя не сохранилось пустым", async () => {
      await expect(profilePage.nameInput).not.toHaveValue("");
    });
  });

  test("Позитивный: одновременное редактирование Telegram, био и таймзоны", async ({ page }) => {
    await test.step("Хост: заполняет Telegram, «О себе» и часовой пояс", async () => {
      await profilePage.telegramInput.fill(host.newTelegram);
      await profilePage.bioInput.fill(host.newBio);
      await profilePage.saveTimezone(host.newTimezone);
    });

    await test.step("Хост: перезагружает страницу", async () => {
      await page.reload();
    });

    await test.step("Хост: после reload проверяет все сохранённые данные с сервера", async () => {
      await expect(profilePage.telegramInput).toHaveValue(host.newTelegram);
      await expect(profilePage.bioInput).toHaveValue(host.newBio);
      await expect(profilePage.timezoneSelect).toHaveValue(host.newTimezone);
    });
  });

  test("Позитивный: удаление ранее добавленного навыка из списка", async ({ page }) => {
    await test.step("Хост: добавляет навык «могу помочь»", async () => {
      await profilePage.addSkill(skillTag, "can_help");
    });

    await test.step("Хост: удаляет ранее добавленный навык", async () => {
      await profilePage.removeSkill(skillTag);
      await profilePage.saveProfile(page);
    });

    await test.step("Хост: перезагружает страницу", async () => {
      await page.reload();
    });

    await test.step("Хост: после reload проверяет, что навык удалился на сервере", async () => {
      await expect(profilePage.skillChips.filter({ hasText: skillTag })).toHaveCount(0);
    });
});
});
  
    
