import { test, expect, type Page } from "@playwright/test";

type TestUser = {
  // поля тестового пользователя
  name: string;
  email: string;
  password: string;
};

function makeUser(role: string, runId: number): TestUser {
  return {
    name: `${role} Автотест ${runId}`,
    email: `${role}-${runId}@example.com`,
    password: "testpass1234",
  };
}

// Pages
const startPage = "/pomidorqa/auth/register";
const profilePage = "/pomidorqa/profile";

// helpers


//register
const registerNameInput = (page: Page) => page.getByLabel("Имя");
const registerEmailInput = (page: Page) => page.getByLabel("Email");
const registerPasswordInput = (page: Page) => page.getByLabel("Пароль");
const registerSubmitButton = (page: Page) => page.getByRole("button", { name: "Зарегистрироваться" });

//profile
const profileNameInput = (page: Page) => page.getByLabel("Имя");
const profileTelegramInput = (page: Page) => page.getByLabel("Telegram");
const profileTimeZoneSelect = (page: Page) => page.getByLabel("Часовой пояс");
const profileAboutInput = (page: Page) => page.getByLabel("О себе");
const profileSaveButton = (page: Page) => page.getByRole("button", { name: "Сохранить" });
const profileSlillsInput = (page: Page) => page.getByLabel("Навык");
const profileSkillTipeSelect = (page: Page) => page.getByLabel("Тип");
const profileAddSkillButton = (page: Page) => page.getByRole("button", { name: "Добавить" });
const profileCanHelpSkills = (page: Page) => page.getByTestId("can-help-skills");
const profileCanHelpCount = (page: Page) => page.locator('[title="Убрать"]');


async function registerUser(page: Page, user: TestUser) {
  await page.goto(startPage);
  await registerNameInput(page).fill(user.name);
  await registerEmailInput(page).fill(user.email);
  await registerPasswordInput(page).fill(user.password);
  await registerSubmitButton(page).click();
  await expect(page).toHaveURL(/\/pomidorqa\/?$/);
}

async function makeTag(page: Page) {
    const SkillTag = `Навык ${Date.now()}`;
    await profileSlillsInput(page).fill(SkillTag);
    await profileSkillTipeSelect(page).selectOption("can_help");
    await profileAddSkillButton(page).click();
}

test.describe("Восемь проверок в профиле", () => {
  
  test.beforeEach(async ({ page }) => {
    const runId = Date.now();
    const user = makeUser("peace", runId);
    await registerUser(page, user);
    await page.goto(profilePage);
  });

  test("Тест1: Изменение имени пользователя в профиле", async ({ page }) => {
    const NewName = `Новое имя ${Date.now()}`;
    await profileNameInput(page).fill(NewName);
    await profileSaveButton(page).click();
    await test.step("Изменено имя пользователя", async () => {
      await expect(profileNameInput(page)).toHaveValue(NewName);
    });
  });

  test("Тест 2: Добавление Telegram", async ({ page }) => {
    const Telegram = `@telegram ${Date.now()}`;
    await profileTelegramInput(page).fill(Telegram);
    await profileSaveButton(page).click();
    await test.step("Добавлен Telegram", async () => {
      await expect(profileTelegramInput(page)).toHaveValue(Telegram);  
    });
  });

  test("Тест 3:  Указание часового пояса", async ({ page }) => {
    await profileTimeZoneSelect(page).selectOption("Asia/Vladivostok");
    await profileSaveButton(page).click();
    await test.step("Указан часовой пояс", async () => {
      await expect(profileTimeZoneSelect(page)).toHaveValue("Asia/Vladivostok"); 
    });
  });

  test("Тест 4: Заполнение блока О себе", async ({ page }) => {
    const About = `О себе ${Date.now()}`;
    await profileAboutInput(page).fill(About);
    await profileSaveButton(page).click();
    await test.step("Заполнен блок о себе", async () => {
     await expect(profileAboutInput(page)).toHaveValue(About); 
    });
  });

  test("Тест 5: Добавление нового навыка", async ({ page }) => {
    const SkillTag = `Навык ${Date.now()}`;
    await profileSlillsInput(page).fill(SkillTag);
    await profileSkillTipeSelect(page).selectOption("can_help");
    await profileAddSkillButton(page).click();
    await makeTag(page);
    await test.step("Навык добавлен с заявленным наименованием", async () => {
     await expect(profileCanHelpSkills(page)).toContainText(SkillTag); 
    });
  });

   test("Тест 6: Удаление навыка", async ({ page }) => {
    await makeTag(page);
    await makeTag(page);
    await makeTag(page);
    await profileCanHelpCount(page).first().hover(); 
    await profileCanHelpCount(page).first().click();
    await test.step("Удален один навык из трех", async () => {
    await expect(profileCanHelpCount(page)).toHaveCount(2);  
    });
  });

    test("Тест 7: Добавление нескольких навыков", async ({ page }) => {
    await makeTag(page);
    await makeTag(page);
    await makeTag(page);
    await makeTag(page);
    await makeTag(page);
    await makeTag(page);
    await makeTag(page);
    await test.step("Проверем, что добавлено 7 навыков", async () => {
      await expect(profileCanHelpCount(page)).toHaveCount(7);  
    });    
  });

    test("Тест 9: Проверяем, что навык удален", async ({ page }) => {
    await makeTag(page);
    await profileCanHelpCount(page).first().hover(); 
    await profileCanHelpCount(page).first().click();
    await test.step("Навык не виден", async () => {
      await expect(profileCanHelpCount(page).first()).not.toBeVisible();  
    });    
    await test.step("Навык не существует", async () => {
      await expect(profileCanHelpCount(page).first()).toHaveCount(0);
    });
  });
});