import { test, expect, type Page } from "@playwright/test";

type TestUser = {
  name: string;
  email: string;
  password: string;
};

const LOCATORS = {
  register: {
    name: (page: Page) => page.getByLabel("Имя"),
    email: (page: Page) => page.getByLabel("Email"),
    password: (page: Page) => page.getByLabel("Пароль"),
    submit: (page: Page) =>
      page.getByRole("button", { name: "Зарегистрироваться" }),
  },

  profile: {
    name: (page: Page) => page.getByLabel("Имя"),
    telegram: (page: Page) => page.getByLabel("Telegram"),
    timeZone: (page: Page) => page.getByLabel("Часовой пояс"),
    bio: (page: Page) => page.getByLabel("О себе"),
    save: (page: Page) => page.getByRole("button", { name: "Сохранить" }),
  },

  skill: {
    input: (page: Page) => page.getByLabel("Навык"),
    type: (page: Page) => page.getByLabel("Тип"),
    add: (page: Page) => page.getByRole("button", { name: "Добавить" }),
    canHelp: (page: Page) => page.getByTestId("can-help-skills"),
  },
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
  await LOCATORS.register.name(page).fill(user.name);
  await LOCATORS.register.email(page).fill(user.email);
  await LOCATORS.register.password(page).fill(user.password);
  await LOCATORS.register.submit(page).click();
  await expect(page).toHaveURL(/\/pomidorqa\/?$/);
}

test.describe("Профиль пользователя: редактирование полей", () => {
  test.beforeEach(async ({ page }) => {
    const user = makeUser("profile", Date.now());
    await registerUser(page, user);
    await page.goto("/pomidorqa/profile");
    await expect(LOCATORS.profile.name(page)).toBeVisible();
  });

  test("Изменение имени", async ({ page }) => {
    const newName = `Новое имя ${Date.now()}`;
    await LOCATORS.profile.name(page).fill(newName);
    await LOCATORS.profile.save(page).click();
    await expect(LOCATORS.profile.name(page)).toHaveValue(newName);
  });

  test("Изменение часового пояса", async ({ page }) => {
    const newTimeZone = "Asia/Krasnoyarsk";
    await expect(LOCATORS.profile.timeZone(page)).toHaveValue("Europe/Moscow");
    await LOCATORS.profile.timeZone(page).selectOption(newTimeZone);
    await LOCATORS.profile.save(page).click();
    await expect(LOCATORS.profile.timeZone(page)).toHaveValue(newTimeZone);
  });

  test("Изменение Telegram", async ({ page }) => {
    const newTelegram = `@something_${Date.now()}`;
    await LOCATORS.profile.telegram(page).fill(newTelegram);
    await LOCATORS.profile.save(page).click();
    await expect(LOCATORS.profile.telegram(page)).toHaveValue(newTelegram);
  });

  test('Изменение поля "О себе"', async ({ page }) => {
    const newBio = `Привет, это проверка поля bio, ${Date.now()}`;
    await LOCATORS.profile.bio(page).fill(newBio);
    await LOCATORS.profile.save(page).click();
    await expect(LOCATORS.profile.bio(page)).toHaveValue(newBio);
  });

  test('Добавление навыка в блок "Могу помочь"', async ({ page }) => {
    const skillTag = `Skill-${Date.now()}`;
    await LOCATORS.skill.input(page).fill(skillTag);
    await LOCATORS.skill.type(page).selectOption("can_help");
    await LOCATORS.skill.add(page).click();
    await expect(LOCATORS.skill.canHelp(page)).toContainText(skillTag);
  });
});
