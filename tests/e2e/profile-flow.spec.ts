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
    await profilePage.reloadAndExpectName(newName);
  });

  test("часовой пояс: выбираем из списка", async () => {
    const timezone = "Asia/Yekaterinburg";
    await profilePage.changeTimezoneAndSave(timezone);
    await profilePage.reloadAndExpectTimezone(timezone);
  });

  test("telegram: заполняем пустое поле", async () => {
    const telegram = `@qa_timur_cat${Date.now()}`;
    await profilePage.addTelegramAndSave(telegram);
    await profilePage.reloadAndExpectTelegram(telegram);
  });

  test("о себе: заполняем многострочное поле", async () => {
    const bio = `QA-инженер, прогон ${Date.now()}. Пытаюсь разобраться в Playwright.`;
    await profilePage.addBioAndSave(bio);
    await profilePage.reloadAndExpectBio(bio);
  });

  test("навык: заполняем, выбираем тип и добавляем", async () => {
    const skillTag = `Playwright-demo-${Date.now()}`;
    await profilePage.addSkill(skillTag);
    await profilePage.expectSkillInCanHelp(skillTag);
  });

  test("негатив: пустой навык не добавляется", async () => {
    await profilePage.clickAddSkillWithoutInput();
    await profilePage.expectNoSkills();
  });

  test("негатив: навык «хочу разобрать» не попадает в блок «могу помочь»", async () => {
    const runId = Date.now();
    const canHelpTag = `CanHelp-${runId}`;
    const wantToLearnTag = `WantToLearn-${runId}`;

    await profilePage.addSkill(canHelpTag);
    await profilePage.addSkill(wantToLearnTag, "want_to_learn");
    await profilePage.expectSkillInCanHelp(canHelpTag);
    await profilePage.expectSkillNotInCanHelp(wantToLearnTag);
  });

  test("форма профиля: три поля сохраняются за один раз", async () => {
    const runId = Date.now();
    const name = `Тимур Тестовый ${runId}`;
    const telegram = `@qa_timur_${runId}`;
    const bio = `QA-инженер, прогон ${runId}. Проверяю форму профиля целиком.`;

    await profilePage.fillNameTelegramBioAndSave(name, telegram, bio);
    await profilePage.reloadAndExpectAllFields(name, telegram, bio);
  });
});
