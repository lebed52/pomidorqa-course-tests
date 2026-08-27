import { test, expect, type Page } from "@playwright/test";
import { text } from "node:stream/consumers";

// --- Карта локаторов ----
const registerNameInput = (page: Page) => page.getByLabel("Имя");
const registerEmailInput = (page: Page) => page.getByLabel("Email");
const registerPasswordInput = (page: Page) => page.getByLabel("Пароль");
const registerSubmitButton = (page: Page) => page.getByRole("button", { name: "Зарегистрироваться" });

const profileName = (page: Page) => page.getByLabel("Имя" );
const telegramName = (page: Page) => page.getByPlaceholder("@username");
const timezone = (page: Page) => page.getByLabel("Часовой пояс");
const aboutUser = (page: Page) => page.getByRole("textbox", { name: "О себе"});
const saveProfile = (page: Page) => page.getByRole("button", { name: "Сохранить" });

const skillInput = (page: Page) => page.getByLabel("Навык");
const skillType = (page: Page) => page.getByLabel("Тип");
const addSkillButton = (page: Page) => page.getByRole("button", { name: "Добавить" });
const skillBlock = (page: Page) => page.getByRole("heading",{level: 2, name: 'Навыки', exact: true});
const canHelpSkills = (page: Page) => page.getByTestId("can-help-skills");
const needHelpSkills = (page: Page) => page.locator('div[data-skills="want_to_learn"]');;

const skillTag = "Навык";
const newTimezone = "Asia/Yekaterinburg";
const tgNickname = "@username";
const aboutUserText = "О себе хорошо или ничего";


type TestUser = {
  name: string;
  email: string;
  password: string;
};

function makeUser(role: string, runId: number): TestUser {
  return {
    name: `${role} Автотест`,
    email: `${role}-${runId}@example.com`,
    password: "testpass123",
  };
}

async function registerUser(page: Page, user: TestUser) {
    await page.goto("/pomidorqa/auth/register");
    await registerNameInput(page).fill(user.name)
    await registerEmailInput(page).fill(user.email);
    await registerPasswordInput(page).fill(user.password);
    await registerSubmitButton(page).click();
    await expect(page).toHaveURL(/\/pomidorqa\/?$/);
}

test.describe("Тесты на профиле после регистрации", () => {
  let user: TestUser;

  test.beforeEach(async ({ page }) => {
    user = makeUser("student", Date.now());
    await registerUser(page, user);
    await page.goto("/pomidorqa/profile");
  });

  test("Смена имени пользователя в профиле", async ({ page }) => {
    const newName = `${user.name} New`;

    await test.step("Вводим новое имя и сохраняем изменения", async () => {
      await profileName(page).fill(newName);
      await saveProfile(page).click();
      await expect(profileName(page)).toHaveValue(newName);
    });
  });

  test("Смена часового пояса в профиле", async ({ page }) => {

    await test.step("Выбираем часовой пояс и сохраняем изменения", async () => {
        await timezone(page).selectOption(newTimezone);
        await saveProfile(page).click();
        await expect(timezone(page)).toHaveValue(newTimezone);
    });
  });

  test("Смена TG-аккаунта в профиле", async ({ page }) => {
    await test.step("Вводим TG-аккаунт и сохраняем изменения", async () => {
      await telegramName(page).fill(tgNickname);
      await saveProfile(page).click();
      await expect(telegramName(page)).toHaveValue(tgNickname);
    });

  });

  test("Смена информации о себе в профиле", async ({ page }) => {
    await test.step("Вводим информацию о себе и сохраняем изменения", async () => {
      await aboutUser(page).fill(aboutUserText);
      await saveProfile(page).click();
      await expect(aboutUser(page)).toHaveValue(aboutUserText);
    });
  });

  test("Навыков еще нет", async ({ page }) => {
    await test.step("Профиль корректно отображается при отсутствии навыков", async () => {
      await expect(skillBlock(page)).not.toContainText("Хочу разобрать");
      await expect(skillBlock(page)).not.toContainText("Могу помочь с");
    });
  });

  test("Добавление навыка в профиле", async ({ page }) => {
    await test.step("Добавляем навык Навык и сохраняем изменения", async () => {
      await skillInput(page).fill(skillTag);
      await skillType(page).selectOption("can_help");
      await addSkillButton(page).click();
      await expect(canHelpSkills(page)).toContainText(skillTag);
    });
  });

  test("Добавления запроса на навык в профиле", async ({ page }) => {
    await test.step("Добавляем навык, помощь с которым хочет получить пользователь", async () => {
      const runId = Date.now();
      const skillToLearn = `Skill-To-Learn-$(runId)`;

      await skillInput(page).fill(skillToLearn);
      await skillType(page).selectOption("want_to_learn")
      await addSkillButton(page).click();
      await expect(needHelpSkills(page)).toContainText(skillToLearn);
      await needHelpSkills(page).getByText(skillToLearn).click();
      await expect(needHelpSkills(page)).toContainText(skillToLearn);
    });
  });

  test("Удаление навыка из профиля", async ({ page }) => {
    await test.step("Удаляем навык Навык и сохраняем изменения", async () => {
      const runId = Date.now();
      const skillToDelete = `Skill-To-Delete-$(runId)`;

      await skillInput(page).fill(skillToDelete);
      await skillType(page).selectOption("can_help")
      await addSkillButton(page).click();
      await expect(canHelpSkills(page)).toContainText(skillToDelete);
      await canHelpSkills(page).getByText(skillToDelete).click();
      await expect(canHelpSkills(page)).not.toBeVisible();
    });
  });

  test("Поле ввода очищается после добавления навыка", async ({ page }) => {
    await test.step("Добавляем навык", async () => {
      
      await skillInput(page).fill(skillTag);
      await skillType(page).selectOption("can_help");
      await addSkillButton(page).click();
      await expect(canHelpSkills(page)).toContainText(skillTag);
      await expect(skillInput(page)).toBeEmpty();
    });
  });
});