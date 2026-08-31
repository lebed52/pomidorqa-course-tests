import { test, expect, type Page } from "@playwright/test";

type TestUser = {
  name: string;
  email: string;
  password: string;
};

function makeUser(role: string, runId: string): TestUser {
  // фабрика: вернуть уникальные данные, без хардкода email
  return {
    name: `${role} Автотест`,
    email: `${role}-${runId}@example.com`,
    password: "testpass123",
  };
}

//Locators для регистрации пользователя
const registerNameInput = (page: Page) => page.getByLabel("Имя");
const registerEmailInput = (page: Page) => page.getByLabel("Email");
const registerPasswordInput = (page: Page) => page.getByLabel("Пароль");
const registerSubmitButton = (page: Page) => page.getByRole("button", { name: "Зарегистрироваться" });

async function registerUser(page: Page, user: TestUser) {
  await page.goto("/pomidorqa/auth/register");
  await registerNameInput(page).fill(user.name);
  await registerEmailInput(page).fill(user.email);
  await registerPasswordInput(page).fill(user.password);
  await registerSubmitButton(page).click();
  await expect(page).toHaveURL(/\/pomidorqa\/?$/);
}

test.describe("5 тестов профиля: Имя / Часовой пояс / Telegram / О себе / Навык", () => {
  let user: TestUser;

  test.beforeEach(async ({ page }) => {
    const runId = Date.now();
    user = makeUser("user", runId);
    await registerUser(page, user);
    await page.goto("/pomidorqa/profile");
  });

  test("Добавление имени", async ({ page }) => {
    const myName = `Parvina`;
    await registerNameInput(page).fill(myName);
    await page.getByRole("button", { name: "Сохранить" }).click();
    await expect(registerNameInput(page)).toHaveValue(myName);
  });

  test("Выбор часового пояса", async ({ page }) => {
    await page.getByLabel("Часовой пояс").selectOption('Asia/Omsk');
    await page.getByRole("button", { name: "Сохранить" }).click();
    await expect(page.getByLabel("Часовой пояс")).toHaveValue('Asia/Omsk');
  });

  test("Добавление Telegram", async ({ page }) => {
    const myTelegram = `@pnabi`;
    await page.getByLabel("Telegram").fill(myTelegram);
    await page.getByRole("button", { name: "Сохранить" }).click();
    await expect(page.getByLabel("Telegram")).toHaveValue(myTelegram);
  });
  
  test("Добавление о себе", async ({ page }) => {
    const aboutMe = `I am learning QA automation`;
    await page.getByLabel("О себе").fill(aboutMe);
    await page.getByRole("button", { name: "Сохранить" }).click();
    await expect(page.getByLabel("О себе")).toHaveValue(aboutMe);
  });
  
  test("Добавление навыка: могу помочь", async ({ page }) => {
    const skillTag = `Testing`;
    await page.getByLabel("Навык").fill(skillTag);
    await page.getByLabel("Тип").selectOption("can_help");
    await page.getByRole("button", { name: "Добавить" }).click();
    await expect(page.getByTestId("can-help-skills")).toBeVisible();
  });

 //ДЗ 9
  test("Добавление навыка: хочу разобрать", async ({ page }) => {
    const skillTag = `assert`;
    await page.getByLabel("Навык").fill(skillTag);
    await page.getByLabel("Тип").selectOption("want_to_learn");
    await page.getByRole("button", { name: "Добавить" }).click();
    const skill = page.locator(`[data-skill-tag="${skillTag}"]`);
    await expect(skill).toBeVisible();
  });
 
  test("Удаление навыка", async ({ page }) => {
    const skillTag = `negative testing`;
    await page.getByLabel("Навык").fill(skillTag);
    await page.getByLabel("Тип").selectOption("can_help");
    await page.getByRole("button", { name: "Добавить" }).click();
    const skill = page.locator(`[data-skill-tag="${skillTag}"]`);
    await expect(skill).toBeVisible();
    await skill.getByRole("button", { name: `Убрать ${skillTag}` }).click();
    await expect(skill).not.toBeVisible();
  });

  test("Проверка, что пустой навык не добавляется", async ({ page }) => {
  const skills = page.locator("[data-skill-tag]");
  const countBefore = await skills.count();
  await page.getByLabel("Тип").selectOption("can_help");
  await page.getByRole("button", { name: "Добавить" }).click();
  await expect(skills).toHaveCount(countBefore);
 });

});