import { test, expect } from "@playwright/test";
import { makeUser, registerUser } from "../helpers/user";
import { ProfilePage } from "../pages/profile-page";

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
      await profilePage.page.reload();

      await expect(profilePage.nameInput).toHaveValue(user.newName);
    });
  });

  test("часовой пояс: выбираем из списка", async () => {
    const user = makeUser("timezone", Date.now());

    await expect(profilePage.timezoneSelect).toHaveValue(user.timezone);

    await profilePage.saveTimezone(user.newTimezone);
    await profilePage.page.reload();

    await expect(profilePage.timezoneSelect).toHaveValue(user.newTimezone);
  });

  test("telegram: заполняем пустое поле", async () => {
    const user = makeUser("telegram", Date.now());

    await test.step("Заполняем Telegram и сохраняем", async () => {
      await expect(profilePage.telegramInput).toHaveValue("");

      await profilePage.saveTelegram(user.newTelegram);
    });

    await test.step("После перезагрузки Telegram сохранён", async () => {
      await profilePage.page.reload();

      await expect(profilePage.telegramInput).toHaveValue(user.newTelegram);
    });
  });

  test("о себе: заполняем многострочное поле", async () => {
    const user = makeUser("bio", Date.now());

    await profilePage.saveBio(user.newBio);
    await profilePage.page.reload();

    await expect(profilePage.bioInput).toHaveValue(user.newBio);
  });

  test("навык: заполняем, выбираем тип и добавляем", async () => {
    const skillTag = `Playwright-${Date.now()}`;

    await profilePage.addSkill(skillTag, "can_help");

    await expect(profilePage.canHelpSkills).toContainText(skillTag);
  });

  test("негатив: пустой навык не добавляется", async () => {
    await expect(profilePage.skillInput).toHaveValue("");

    await profilePage.addSkill("", "can_help");

    await expect(profilePage.skillChips).toHaveCount(0);
    await expect(profilePage.canHelpSkills).not.toBeVisible();
  });

  test("негатив: навык «хочу разобрать» не попадает в блок «могу помочь»", async () => {
    const canHelpTag = `CanHelp-${Date.now()}`;
    const wantToLearnTag = `WantToLearn-${Date.now()}`;

    await profilePage.addSkill(canHelpTag, "can_help");
    await profilePage.addSkill(wantToLearnTag, "want_to_learn");

    await expect(profilePage.skillChips).toHaveCount(2);
    await expect(profilePage.canHelpSkills).toContainText(canHelpTag);

    await expect(profilePage.canHelpSkills).not.toContainText(wantToLearnTag);
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
      await profilePage.page.reload();

      await expect.soft(profilePage.nameInput).toHaveValue(user.newName);
      await expect.soft(profilePage.telegramInput).toHaveValue(user.newTelegram);
      await expect.soft(profilePage.bioInput).toHaveValue(user.newBio);
    });
  });
});