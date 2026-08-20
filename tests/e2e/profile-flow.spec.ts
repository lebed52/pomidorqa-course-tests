import { test, expect, type Page } from "@playwright/test";

/**
 * @file profile-flow.spec.ts
 * @description E2E-тесты профиля (Имя, Часовой пояс, Telegram, О себе, Навык).
 * 
 * Примечание: Урок 8 (Action Lab). Arrange (makeUser / registerUser) намеренно 
 * продублирован. Вынос в общие хелперы и POM запланирован на Урок 10. 
 * Сегодня не рефакторим.
 * 
 * Запуск:
 * POMIDORQA_BASE_URL=http://localhost:3000 npx playwright test --project=e2e tests/e2e/profile-flow.spec.ts
 */

type TestUser = {
  name: string;
  email: string;
  password: string;
};

function makeUser(role: string): TestUser {
  // Date.now() одного миллисекунд может не хватить, если несколько тестов
  // регистрируются подряд очень быстро — добавляем случайный хвост, чтобы
  // email не хардкодить и не словить дубль.
  const unique = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  return {
    name: `${role} Автотест`,
    email: `${role}-${unique}@example.com`,
    password: "testpass123",
  };
}

// Локаторы — регистрация
const registerNameInput = (page: Page) => page.getByLabel("Имя");
const registerEmailInput = (page: Page) => page.getByLabel("Email");
const registerPasswordInput = (page: Page) => page.getByLabel("Пароль");
const registerSubmitButton = (page: Page) => page.getByRole("button", { name: "Зарегистрироваться" });

// Локаторы — форма профиля (Имя / Telegram / Часовой пояс / О себе одной формой,
// одна кнопка "Сохранить" на все четыре поля сразу)
const profileNameInput = (page: Page) => page.getByLabel("Имя").last();
const profileTelegramInput = (page: Page) => page.getByLabel("Telegram");
const profileTimezoneSelect = (page: Page) => page.getByLabel("Часовой пояс");
const profileBioInput = (page: Page) => page.getByLabel("О себе");
const profileSaveButton = (page: Page) => page.getByRole("button", { name: "Сохранить" });

// Локаторы — блок "Навыки" (отдельно от формы выше, своя кнопка "Добавить")
const profileSkillInput = (page: Page) => page.getByLabel("Навык");
const profileSkillTypeSelect = (page: Page) => page.getByLabel("Тип");
const profileSkillSubmit = (page: Page) => page.getByRole("button", { name: "Добавить" });
const profileCanHelpSkills = (page: Page) => page.getByTestId("can-help-skills");

async function registerUser(page: Page, user: TestUser) {
  await page.goto("/pomidorqa/auth/register");
  await registerNameInput(page).fill(user.name);
  await registerEmailInput(page).fill(user.email);
  await registerPasswordInput(page).fill(user.password);
  await registerSubmitButton(page).click();
  await expect(page).toHaveURL(/\/pomidorqa\/?$/);
}

// Сохранение общей формы профиля (Имя/Telegram/Часовой пояс/О себе) —
// дожидаемся ответа сервера на мутацию, а не просто клика по кнопке,
// иначе reload ниже может застать данные ещё не сохранёнными.
async function saveProfileForm(page: Page) {
  const responsePromise = page.waitForResponse(
    (response) =>
      response.url().includes("/profile") &&
      response.request().method() !== "GET" &&
      response.status() === 200,
    { timeout: 15000 }
  );

  await profileSaveButton(page).click();

  try {
    await responsePromise;
  } catch (err) {
    throw new Error(
      "Не дождались успешного ответа сервера на сохранение профиля за 15с. " +
        "Возможная причина: запрос сохранения бьёт не в путь, содержащий " +
        `'/profile' — сверить реальный endpoint в DevTools (Network). Исходная ошибка: ${err}`
    );
  }
}

test.describe("Профиль пользователя: редактирование полей", () => {
  // Живой прод-стенд — сетевые лаги случаются. Ретраи не маскируют логику
  // теста, только сглаживают инфраструктурный флейк.
  test.describe.configure({ retries: 2 });

  test.beforeEach(async ({ page }) => {
    const user = makeUser("profile");
    await registerUser(page, user);
    await page.goto("/pomidorqa/profile");
    await expect(profileNameInput(page)).toBeVisible();
  });

  test("изменение имени сохраняется после перезагрузки", async ({ page }) => {
    const newName = `Новое имя ${Date.now()}`;

    await profileNameInput(page).fill(newName);
    await saveProfileForm(page);

    await page.reload();
    await expect(profileNameInput(page)).toHaveValue(newName);
  });

  test("изменение часового пояса сохраняется после перезагрузки", async ({ page }) => {
    const newTimezone = "Asia/Yekaterinburg";

    await expect(profileTimezoneSelect(page)).toHaveValue("Europe/Moscow");

    await profileTimezoneSelect(page).selectOption(newTimezone);
    await saveProfileForm(page);

    await page.reload();
    await expect(profileTimezoneSelect(page)).toHaveValue(newTimezone);
  });

  test("изменение Telegram сохраняется после перезагрузки", async ({ page }) => {
    const newTelegram = `@e2e_${Date.now()}`;

    await profileTelegramInput(page).fill(newTelegram);
    await saveProfileForm(page);

    await page.reload();
    await expect(profileTelegramInput(page)).toHaveValue(newTelegram);
  });

  test('изменение поля "О себе" сохраняется после перезагрузки', async ({ page }) => {
    const newBio = `Автотест проверяет поле bio, run ${Date.now()}`;

    await profileBioInput(page).fill(newBio);
    await saveProfileForm(page);

    await page.reload();
    await expect(profileBioInput(page)).toHaveValue(newBio);
  });

  test("добавленный навык отображается в блоке «могу помочь»", async ({ page }) => {
    const skillTag = `Skill-${Date.now()}`;

    await profileSkillInput(page).fill(skillTag);
    await profileSkillTypeSelect(page).selectOption("can_help");
    await profileSkillSubmit(page).click();

    await expect(profileCanHelpSkills(page)).toContainText(skillTag);
  });
});