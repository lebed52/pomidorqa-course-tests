import { test } from "@playwright/test";
import { makeUser, registerUser } from "../helpers/user";
import { ProfilePage } from "../pages/profile-page";

test.describe("Профиль: действия с полями", () => {
  let profilePage: ProfilePage;

  test.beforeEach(async ({ page }) => {
    const user = makeUser("hw8", Date.now());
    await registerUser(page, user);
    await page.goto("/pomidorqa/profile");
    profilePage = new ProfilePage(page);
  });

  test("имя: вводим новое и сохраняем", async () => {
    const newName = `Тимур Тестович ${Date.now()}`;
    await profilePage.changeNameAndSave(newName);
    await profilePage.page.reload();
    await expect(profilePage.nameInput()).toHaveValue(newName);
  });

  test("часовой пояс: выбираем из списка", async () => {
    const timezone = "Asia/Yekaterinburg";
    await profilePage.changeTimezoneAndSave(timezone);
    await profilePage.page.reload();
    await expect(profilePage.timezoneSelect()).toHaveValue(timezone);
  });

  test("telegram: заполняем пустое поле", async () => {
    const telegram = `@qa_timur_cat${Date.now()}`;
    await profilePage.addTelegramAndSave(telegram);
    await profilePage.page.reload();
    await expect(profilePage.telegramInput()).toHaveValue(telegram);
  });

  test("о себе: заполняем многострочное поле", async () => {
    const bio = `QA-инженер, прогон ${Date.now()}. Пытаюсь разобраться в Playwright.`;
    await profilePage.addBioAndSave(bio);
    await profilePage.page.reload();
    await expect(profilePage.bioInput()).toHaveValue(bio);
  });

  test("навык: заполняем, выбираем тип и добавляем", async () => {
    const skillTag = `Playwright-demo-${Date.now()}`;
    await profilePage.addSkill(skillTag);
    await expect(profilePage.canHelpSkills()).toContainText(skillTag);
  });

  test("негатив: пустой навык не добавляется", async () => {
    await profilePage.clickAddSkillWithoutInput();
    await expect(profilePage.skillChips()).toHaveCount(0);
    await expect(profilePage.canHelpSkills()).not.toBeVisible();
  });

  test("негатив: навык «хочу разобрать» не попадает в блок «могу помочь»", async () => {
    const runId = Date.now();
    const canHelpTag = `CanHelp-${runId}`;
    const wantToLearnTag = `WantToLearn-${runId}`;

    await profilePage.addSkill(canHelpTag);
    await profilePage.addSkill(wantToLearnTag, "want_to_learn");
    await expect(profilePage.canHelpSkills()).toContainText(canHelpTag);
    await expect(profilePage.canHelpSkills()).not.toContainText(wantToLearnTag);
  });

  test("форма профиля: три поля сохраняются за один раз", async () => {
    const runId = Date.now();
    const name = `Тимур Тестовый ${runId}`;
    const telegram = `@qa_timur_${runId}`;
    const bio = `QA-инженер, прогон ${runId}. Проверяю форму профиля целиком.`;

    await profilePage.fillNameTelegramBioAndSave(name, telegram, bio);
    await profilePage.page.reload();
    await expect.soft(profilePage.nameInput()).toHaveValue(name);
    await expect.soft(profilePage.telegramInput()).toHaveValue(telegram);
    await expect.soft(profilePage.bioInput()).toHaveValue(bio);
  });
});