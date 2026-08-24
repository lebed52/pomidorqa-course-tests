import { test, expect, type Page } from "@playwright/test";

type TestUser = {
    // поля тестового пользователя
    name: string;
    email: string;
    password: string;
};

function makeUser(role: string, runId: number, password: string): TestUser {
    return {
      name: `${role} Автотест`,
      email: `${role}-${runId}@example.com`,
      password: `${password}123`,
    };
}
//Фабрика локаторов из предыдущего ДЗ - переделаны наименование
const registrationLocators = (page: Page) => ({
    registerNameInput: page.locator("#pomidorqa-register-name"),
    registerEmailInput: page.locator("#pomidorqa-register-email"),
    registerPasswordInput: page.locator("#pomidorqa-register-password"),
    registerSubmitButton: page.getByRole("button", { name: "Зарегистрироваться" }),
  });
  
  const skillLocators = (page: Page, skillTag: string) => ({
    skillInput: page.getByPlaceholder("Например: Playwright, SQL, собеседования"),
    skillTypeSelect: page.getByRole("combobox", { name: "Тип", exact: true }),
    skillSubmitButton: page.getByRole("button", { name: "Добавить" }),
    skillAdded: page.locator(`[data-skill-tag="${skillTag}"]`),
  });

  const profileLocators = (page: Page) => ({
    profileNameInput: page.getByLabel("Имя"),
    saveProfileNameButton: page.getByRole("button", { name: "Сохранить" }),
  });

  const telegramLocators = (page: Page) => ({
    telegramUserName: page.getByPlaceholder("@username"),
  });

  const timezonaLocators = (page: Page) => ({
    timeZonaField: page.getByRole("combobox", { name: "Часовой пояс" }),
  });
  const aboutMySelfLocators = (page: Page) => ({
    aboutMySelfTextarea: page.getByRole('textbox', { name: 'О себе' }),
  });
async function registerUser(page: Page, user: TestUser) {
    // хелпер подготовки: регистрация
    // сюда не класть проверяемое действие теста
    const {
      registerNameInput,
      registerEmailInput,
      registerPasswordInput,
      registerSubmitButton,
    } = registrationLocators(page);

    await page.goto("/pomidorqa/auth/register", {
      waitUntil: "domcontentloaded",
    });
    await registerNameInput.fill(user.name);
    await registerEmailInput.fill(user.email);
    await registerPasswordInput.fill(user.password);
    await registerSubmitButton.click();
    await expect(page).toHaveURL(/\/pomidorqa\/?$/, {
        timeout: 20_000,
    });
}

test.describe("Тесты на изменение имени пользователя", () => {
  let user: TestUser;

  test.beforeEach(async ({ page }) => {
    // Arrange:
    // 1) новый пользователь из фабрики
    // 2) регистрация через хелпер
    // 3) переход на страницу, где будет проверка

    const role = "guest";
    const runId = Date.now();
    const password = "testpassword";

    user = makeUser(role, runId, password);
    await registerUser(page, user);
    await page.goto("/pomidorqa/profile", {
      waitUntil: "domcontentloaded",
    });
  });

  test("Смена имени пользователя", async ({ page }) => {
    // Assert: одна мысль про сцену
    const newName = `Новое имя ${Math.random()}`;

    await test.step("Изменение имени пользователя", async () => {
      const { profileNameInput, saveProfileNameButton } = profileLocators(page);
      await profileNameInput.fill(newName);
      await saveProfileNameButton.click();
      await expect(profileNameInput).toHaveValue(newName);
    });
  });

  test("Добавить Telegram username в профиль", async ({ page }) => {
    await test.step("Добавление Telegram username", async () => {
    const newTelegramUserName = `@new_username_${Date.now()}`;
    const { telegramUserName } = telegramLocators(page);
    await telegramUserName.fill(newTelegramUserName);
    await expect(telegramUserName).toHaveValue(newTelegramUserName);
    });
  });

   test("Выбор часового пояса", async ({ page }) => {
    await test.step("Выбор часового пояса", async () => {
    const { timeZonaField } = timezonaLocators(page);
    await timeZonaField.selectOption({label:'Asia/Yekaterinburg'});
    await expect(timeZonaField).toHaveValue('Asia/Yekaterinburg');
     });
  });

  test("Добавление информации о себе", async ({ page }) => {
    await test.step("Добавление информации о себе", async () => {
    const { aboutMySelfTextarea } = aboutMySelfLocators(page);
    await aboutMySelfTextarea.fill("Я тестировщик и я тестю)");
    await expect(aboutMySelfTextarea).toHaveValue("Я тестировщик и я тестю)");
    });
  });

  test("Сохранение профиля", async ({ page }) => {
    await test.step("Сохранение профиля", async () => {
      const aboutText = `Я тестировщик и я тестю) ${Date.now()}`;
      const { aboutMySelfTextarea } = aboutMySelfLocators(page);
      const { saveProfileNameButton } = profileLocators(page);

      await aboutMySelfTextarea.fill(aboutText);
      await saveProfileNameButton.click();
      await page.goto("/pomidorqa/profile");
      await expect(aboutMySelfTextarea).toHaveValue(aboutText);
    });
  });

  test('Добавление навыка "могу помочь"', async ({ page }) => {
    // Assert: другая мысль на той же сцене
    await test.step("Новый навык", async () => {
      const skillTag = `SQL-${Date.now()}`;
      const { skillInput, skillTypeSelect, skillSubmitButton, skillAdded } =
        skillLocators(page, skillTag);

      await skillInput.fill(skillTag);
      await skillTypeSelect.selectOption("can_help");
      await skillSubmitButton.click();
      await expect(skillAdded).toBeVisible();
    });
  });
});
