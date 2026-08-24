import { test, expect, type Page } from "@playwright/test";

const ROUTES = {
  register: "/pomidorqa/auth/register",
  profile: "/pomidorqa/profile",
};

// Arrange: скопировано из ДЗ-7 (makeUser / registerUser)
const registerNameInput = (page: Page) => page.getByLabel("Имя");
const registerEmailInput = (page: Page) => page.getByLabel("Email");
const registerPasswordInput = (page: Page) => page.getByLabel("Пароль");
const registerSubmitButton = (page: Page) => page.getByRole("button", { name: "Зарегистрироваться" });

type TestUser = {
  name: string;
  email: string;
  password: string;
};

function makeUser(role: string, runId: number): TestUser {
  return {
    name: `${role} Автотест ${runId}`,
    email: `${role}-${runId}@example.com`,
    password: "testpass123",
  };
}

async function registerUser(page: Page, user: TestUser) {
  await page.goto(ROUTES.register);
  await registerNameInput(page).fill(user.name);
  await registerEmailInput(page).fill(user.email);
  await registerPasswordInput(page).fill(user.password);
  await registerSubmitButton(page).click();
  await expect(page).toHaveURL(/\/pomidorqa\/?$/);
}

const profileNameInput = (page: Page) => page.getByLabel("Имя");
const profileTimezoneSelect = (page: Page) => page.getByLabel("Часовой пояс");
const profileTelegramInput = (page: Page) => page.getByLabel("Telegram");
const profileAboutInput = (page: Page) => page.getByLabel("О себе");
const profileSaveButton = (page: Page) => page.getByRole("button", { name: "Сохранить" });

const profileSkillInput = (page: Page) => page.getByLabel("Навык");
const profileSkillTypeSelect = (page: Page) => page.getByLabel("Тип");
const profileAddSkillButton = (page: Page) => page.getByRole("button", { name: "Добавить" });
const profileCanHelpSkills = (page: Page) => page.getByTestId("can-help-skills");

async function saveProfileAndWaitResponse(page: Page) {
  const saved = page.waitForResponse(
    (response) =>
      response.url().endsWith(ROUTES.profile) && response.request().method() === "POST"
  );
  await profileSaveButton(page).click();
  await saved;
}

test.describe("Профиль: карточка участника после регистрации", () => {
  test.beforeEach(async ({ page }) => {
    const user = makeUser("hw8", Date.now());
    await registerUser(page, user);
    await page.goto(ROUTES.profile);
  });

  test("смена имени в профиле сохраняется", async ({ page }) => {
    const newName = `Тестовое Имя ${Date.now()}`;

    // Act
    await test.step("Меняем имя и дожидаемся ответа сервера", async () => {
      await profileNameInput(page).fill(newName);
      await saveProfileAndWaitResponse(page);
    });

    await test.step("После перезагрузки имя пришло с сервера", async () => {
      await page.reload();
      await expect(profileNameInput(page)).toHaveValue(newName);
    });
  });

  test("смена часового пояса сохраняется", async ({ page }) => {
    let newTimezone = "";

    // Act
    await test.step("Выбираем часовой пояс, отличный от текущего, и сохраняем", async () => {
      const select = profileTimezoneSelect(page);
      const currentValue = await select.inputValue();

      const optionValues = await select.locator("option").evaluateAll((options) =>
        options.map((option) => (option as HTMLOptionElement).value).filter(Boolean)
      );
      newTimezone = optionValues.find((value) => value !== currentValue) ?? optionValues[0];
      expect(newTimezone, "в селекте часового пояса должна быть хотя бы одна опция").toBeTruthy();

      await select.selectOption(newTimezone);
      await saveProfileAndWaitResponse(page);
    });

    await test.step("После перезагрузки часовой пояс пришёл с сервера", async () => {
      await page.reload();
      await expect(profileTimezoneSelect(page)).toHaveValue(newTimezone);
    });
  });

  test("заполнение Telegram сохраняется", async ({ page }) => {
    const telegram = `@hw8_autotest_${Date.now()}`;

    // Act
    await test.step("Заполняем Telegram и сохраняем", async () => {
      await profileTelegramInput(page).fill(telegram);
      await saveProfileAndWaitResponse(page);
    });

    await test.step("После перезагрузки Telegram пришёл с сервера", async () => {
      await page.reload();
      await expect(profileTelegramInput(page)).toHaveValue(telegram);
    });
  });

  test("заполнение «О себе» сохраняется", async ({ page }) => {
    const about = `Автотест ДЗ-8, отметка времени ${Date.now()}`;

    // Act
    await test.step("Заполняем «О себе» и сохраняем", async () => {
      await profileAboutInput(page).fill(about);
      await saveProfileAndWaitResponse(page);
    });

    await test.step("После перезагрузки текст пришёл с сервера", async () => {
      await page.reload();
      await expect(profileAboutInput(page)).toHaveValue(about);
    });
  });

  test("добавление навыка «могу помочь»", async ({ page }) => {
    const skillTag = `Playwright-hw8-${Date.now()}`;

    // Act
    await test.step("Добавляем навык", async () => {
      await profileSkillInput(page).fill(skillTag);
      await profileSkillTypeSelect(page).selectOption("can_help");
      await profileAddSkillButton(page).click();
    });

    await test.step("Навык виден в блоке «могу помочь»", async () => {
      await expect(profileCanHelpSkills(page)).toContainText(skillTag);
    });
  });
});