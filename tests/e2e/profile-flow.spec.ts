import { test, expect } from "@playwright/test";
import { deleteUserViaApi, makeProfileData, makeSkillData, makeUser, registerUserViaApi } from "../helpers/user";
import { ProfilePage } from "../pages/profile-page";

const ROUTES = {
  profile: "/pomidorqa/profile",
};

test.describe("Профиль: действия с полями", () => {

  let profilePage: ProfilePage;
  let user: ReturnType<typeof makeUser>;

  test.beforeEach(async ({ page }) => {
    user = makeUser("hw8", Date.now());
    profilePage = new ProfilePage(page);

    await registerUserViaApi(page.context().request, user);
    await page.goto(ROUTES.profile);
  });

  test.afterEach(async ({ page }) => {
    await deleteUserViaApi(page.context().request);
  });

  test("Имя: заполняем поле и сохраняем", async ({ page }) => {
    const { testName: newName } = makeProfileData();
    await test.step("Изменяем поле и сохраняем", async () => {
      await profilePage.changeNameAndSave(newName);

    });

    await test.step("Проверяем, что после перезагрузки имя пришло с сервера", async () => {
      await page.reload();
      await expect(profilePage.nameInput()).toHaveValue(newName);
    });
  });

  test("Часовой пояс: выбираем из списка", async ({ page }) => {
    const { timezone } = makeProfileData();
    await test.step("Изменяем часовой пояс и сохраняем", async () => {
      await profilePage.changeTimezoneAndSave(timezone);
    });

    await test.step("Проверяем, что после перезагрузки часовой пояс сохранился", async () => {
      await page.reload();
      await expect(profilePage.timezoneSelect()).toHaveValue(timezone);
    });
  });

  test("Telegram: заполняем пустое поле", async ({ page }) => {
    const { testTelegram: telegram } = makeProfileData();
    await test.step("Заполняем Telegram и сохраняем", async () => {
      await profilePage.addTelegramAndSave(telegram);
    });

    await test.step("Проверяем, что после перезагрузки Telegram пришёл с сервера", async () => {
      await page.reload();
      await expect(profilePage.telegramInput()).toHaveValue(telegram);
    });
  });

  test("о себе: заполняем многострочное поле", async ({ page }) => {
    const { testBio: bio } = makeProfileData();
    await test.step("Заполняем «О себе» и сохраняем", async () => {
      await profilePage.addBioAndSave(bio);
    });

    await test.step("Проверяем, что после перезагрузки текст пришёл с сервера", async () => {
      await page.reload();
      await expect(profilePage.bioInput()).toHaveValue(bio);
    });
  });

  test("Навык: заполняем, выбираем тип и добавляем", async ({ page }) => {
    const { skillTag } = makeProfileData();
    await test.step("Добавляем навык «могу помочь»", async () => {
      await profilePage.addSkill(skillTag, "can_help");
    });

    await test.step("Проверяем, что навык появился в блоке «могу помочь»", async () => {
      await expect(profilePage.canHelpSkills()).toContainText(skillTag);
    });
  });

  test("Негатив: пустой навык не добавляется", async ({ page }) => {
    await test.step("Пытаемся добавить навык без заполнения поля", async () => {
      await profilePage.clickAddSkillWithoutInput();
    });

    await test.step("Проверяем, что навык не появился", async () => {
      await expect(profilePage.skillChips()).toHaveCount(0);
      await expect(profilePage.canHelpSkills()).not.toBeVisible();
    });
  });

  test("Негатив: навык «хочу разобрать» не попадает в блок «могу помочь»", async ({ page }) => {
    const { canHelpTag, wantToLearnTag } = makeSkillData();
    await test.step("Добавляем навык «могу помочь»", async () => {
      await profilePage.addSkill(canHelpTag, "can_help");
    });

    await test.step("Добавляем навык «хочу разобрать»", async () => {
      await profilePage.addSkill(wantToLearnTag, "want_to_learn");
    });

    await test.step("Проверяем, что навыки находятся в своих блоках", async () => {
      await expect(profilePage.skillChips()).toHaveCount(2);
      await expect(profilePage.canHelpSkills()).toContainText(canHelpTag);
      await expect(profilePage.canHelpSkills()).not.toContainText(wantToLearnTag);
    });
  });

  test("Форма профиля: три поля сохраняются за один раз", async ({ page }) => {
    const { name, telegram, bio } = makeProfileData();
    await test.step("Заполняем Имя, Telegram и «О себе», сохраняем разом", async () => {
      await profilePage.fillNameTelegramBioAndSave(name, telegram, bio);
    });

    await test.step("Проверяем, что после перезагрузки все три значения пришли с сервера", async () => {
      await page.reload();
      await expect.soft(profilePage.nameInput()).toHaveValue(name);
      await expect.soft(profilePage.telegramInput()).toHaveValue(telegram);
      await expect.soft(profilePage.bioInput()).toHaveValue(bio);
    });
  });
  });