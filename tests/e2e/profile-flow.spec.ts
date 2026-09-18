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

  test("Смена имени в профиле", async () => {
    await profilePage.saveName(host.newName);
    await expect(profilePage.nameInput).toHaveValue(host.newName);
  });

  test("Добавление tg", async () => {
    await profilePage.saveTelegram(host.telegram);
    await expect(profilePage.telegramInput).toHaveValue(host.telegram);
  });

  test("Смена часового пояса", async () => {
    await profilePage.saveTimezone(host.timezone);
    await expect(profilePage.timezoneSelect).toHaveValue(host.timezone);
  });

  test("Добавление инфо О себе", async () => {
    await profilePage.saveBio(host.bio);
    await expect(profilePage.bioInput).toHaveValue(host.bio);
  });

  test("Добавление навыка", async () => {
    await profilePage.addSkill(skillTag, "can_help");
    await expect(profilePage.skillChips.filter({ hasText: skillTag })).toBeVisible();
  });

  test("Негативный: сохранение профиля с пустым полем Имя", async ({ page }) => {
    await profilePage.nameInput.clear();
    await profilePage.saveButton.click();
    await expect(page).not.toHaveURL(/\/pomidorqa\/auth/);
    
    const isNameValid = await profilePage.nameInput.evaluate(el => el.checkValidity());
    expect(isNameValid).toBe(false);

  });

  test("Позитивный: одновременное редактирование Telegram, био и таймзоны", async () => {
    await profilePage.telegramInput.fill(host.newTelegram);
    await profilePage.bioInput.fill(host.newBio);
    await profilePage.saveTimezone(host.newTimezone);
    
    await expect(profilePage.telegramInput).toHaveValue(host.newTelegram);
    await expect(profilePage.bioInput).toHaveValue(host.newBio);
    await expect(profilePage.timezoneSelect).toHaveValue(host.newTimezone);
  });

  test("Позитивный: удаление ранее добавленного навыка из списка", async () => {
    await profilePage.addSkill(skillTag, "can_help");
    await expect(profilePage.skillChips.filter({ hasText: skillTag })).toBeVisible();
    
    await profilePage.removeSkill();
    await expect(profilePage.skillChips.filter({ hasText: skillTag })).toHaveCount(0);
  });
});