import { test, expect, type Page } from "@playwright/test";

// ЛОКАТОРЫ

// Регистрация юзера 
const registerNameInput = (page: Page) => page.getByLabel('Имя');
const registerEmailInput = (page: Page) => page.getByLabel('Email');
const registerPasswordInput = (page: Page) => page.getByLabel('Пароль');
const registerSubmitButton = (page: Page) => page.getByRole('button', { name: 'Зарегистрироваться' });

// Имя
const profileNameInput = (page: Page) => page.getByLabel('Имя');
const profileSaveButton = (page: Page) => page.getByRole('button', { name: 'Сохранить' });

// Telegram
const profileTelegramInput = (page: Page) => page.getByLabel('Telegram');

// Часовой пояс
const profileTimeZoneSelect = (page: Page) => page.getByLabel('Часовой пояс');

// Навык "Могу помочь"
const profileSkillInput = (page: Page) => page.getByLabel('Навык');
const profileSkillTypeSelect = (page: Page) => page.getByLabel('Тип');
const profileSkillSubmit = (page: Page) => page.getByRole('button', { name: 'Добавить' });
const profileSkillList = (page: Page) => page.getByTestId('can-help-skills');

// Навык "Хочу разобраться"

// Удаление навыка
const profileSkillDeleteButton = (page: Page, skill: string) => profileSkillList(page).getByRole('button', { name: skill });
const profileSkillElement = (page: Page, skill: string) => page.locator(`[data-skill-tag="${skill}"]`);

// "О себе"
const profileAboutMeInput = (page: Page) => page.getByLabel('О себе');

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
  await registerNameInput(page).fill(user.name);
  await registerEmailInput(page).fill(user.email);
  await registerPasswordInput(page).fill(user.password);
  await registerSubmitButton(page).click();
  await expect(page).toHaveURL(/\/pomidorqa\/?$/);
}

test.describe("Профиль: действия", () => {
  let user: TestUser;

  test.beforeEach(async ({ page }) => {
    const runId = Date.now();
    user = makeUser("testuser", runId);
    await registerUser(page, user);
    await page.goto("/pomidorqa/profile");
  });

  test("Смена имени в профиле", async ({ page }) => {
    const newName = `Новое имя ${Date.now()}`;

    await test.step("Меняем имя", async () => {
      await profileNameInput(page).fill(newName);
      await profileSaveButton(page).click();
    });

    await test.step("Проверяем смену имени", async () => {
      await expect(profileNameInput(page)).toHaveValue(newName);
    });
  });

  test("Добавление Telegram", async ({ page }) => {
    const telegram = `Телеграмм-${Date.now()}`;
 
    await test.step("Добавляем Telegram", async () => {
     await profileTelegramInput(page).fill(telegram);
     await profileSaveButton(page).click();
    });
    
    await test.step("Проверяем добавление Telegram", async () => {
       await expect(profileTelegramInput(page)).toHaveValue(telegram);
    });
   });

   test("Смена Telegram", async ({ page }) => {
    const tg1 = `@user_${Date.now()}`;
    const tg2 = `@user_${Date.now() + 1}`;
  
    await test.step("Добавление Telegram", async () => {
      await profileTelegramInput(page).fill(tg1);
      await profileSaveButton(page).click();
    });
  
    await test.step("Проверяем добавление Telegram", async () => {
      await expect(profileTelegramInput(page)).toHaveValue(tg1);
    });
  
    await test.step("Меняем Telegram", async () => {
      await profileTelegramInput(page).fill(tg2);
      await profileSaveButton(page).click();
    });
  
    await test.step("Проверяем изменение Telegram", async () => {
      await expect(profileTelegramInput(page)).toHaveValue(tg2);
    });
  });

  test("Добавление часового пояса", async ({ page }) => {

    await test.step("Добавляем часовой пояс", async () => {
      await profileTimeZoneSelect(page).selectOption('Europe/Kaliningrad');
      await profileSaveButton(page).click();
    });

    await test.step("Проверяем добавление часового пояса", async () => {
      await expect(profileTimeZoneSelect(page)).toHaveValue('Europe/Kaliningrad');
    });
  });

  test("Добавление навыка 'Могу помочь'", async ({ page }) => {
    const skill = `Навык-${Date.now()}`;
    
    await test.step("Добавляем навык 'Могу помочь'", async () => {
      await profileSkillInput(page).fill(skill);
       await profileSkillTypeSelect(page).selectOption("can_help");
       await profileSkillSubmit(page).click();
      });

    await test.step("Проверяем добавление навыка 'Могу помочь'", async () => {
      await expect(profileSkillList(page)).toContainText(skill);
    });
  });

   test("Добавление навыка 'Хочу разобраться'", async ({ page }) => {
    const skill = `Навык-${Date.now()}`;
    
    await test.step("Добавляем навык 'Хочу разобраться'", async () => {
      await profileSkillInput(page).fill(skill);
      await profileSkillTypeSelect(page).selectOption("want_to_learn");
      await profileSkillSubmit(page).click();
    });
   await test.step("Проверяем добавление навыка 'Хочу разобраться'", async () => {
    await expect(profileSkillElement(page, skill)).toBeVisible();
    });
  });

  
  test("Удаление навыка", async ({ page }) => {
    const skill = `Навык-${Date.now()}`;

    await test.step("Добавляем навык", async () => {
       await profileSkillInput(page).fill(skill);
       await profileSkillTypeSelect(page).selectOption("can_help");
       await profileSkillSubmit(page).click();
     });

    await test.step("Проверяем, что навык появился", async () => {
      await expect(profileSkillList(page)).toContainText(skill);
    });

    await test.step("Удаляем навык", async () => {
      const deleteButton = profileSkillDeleteButton(page, skill);
      await expect(deleteButton).toBeVisible();
      await deleteButton.click();
    });

    await expect(profileSkillElement(page, skill)).not.toBeVisible();
  });

  test("Добавление 'О себе'", async ({ page }) => {
    const about = `Моя заметка-${Date.now()}`;

    await test.step("Добавляем 'О себе'", async () => {
      await profileAboutMeInput(page).fill(about);
      await profileSaveButton(page).click();  
    });

    await test.step("Проверяем, что 'O себе' появилось", async () => {
      await expect(profileAboutMeInput(page)).toHaveValue(about);
    });
  });
});
