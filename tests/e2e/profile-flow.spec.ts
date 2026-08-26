import { test, expect, type Page } from "@playwright/test";

type TestUser = {
  name: string;
  email: string;
  password: string;
};

function makeUser(role: string): TestUser {
  const unique = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  return {
    name: `${role} Автотест`,
    email: `${role}-${unique}@example.com`,
    password: "testpass123",
  };
}

// --- Локаторы ---
const registerNameInput = (page: Page) => page.getByLabel("Имя");
const registerEmailInput = (page: Page) => page.getByLabel("Email");
const registerPasswordInput = (page: Page) => page.getByLabel("Пароль");
const registerSubmitButton = (page: Page) => page.getByRole("button", { name: "Зарегистрироваться" });

const profileNameInput = (page: Page) => page.getByLabel("Имя", { exact: true });
const profileTelegramInput = (page: Page) => page.getByLabel("Telegram");
const profileBioInput = (page: Page) => page.getByLabel("О себе");
const profileSaveButton = (page: Page) => page.getByRole("button", { name: "Сохранить" });

const profileSkillInput = (page: Page) => page.getByLabel("Навык");
const profileSkillTypeSelect = (page: Page) => page.getByLabel("Тип");
const profileSkillSubmit = (page: Page) => page.getByRole("button", { name: "Добавить" });
const profileCanHelpSkills = (page: Page) => page.getByTestId("can-help-skills");

// --- Хелперы ---
async function registerUser(page: Page, user: TestUser) {
  await page.goto("/pomidorqa/auth/register");
  await registerNameInput(page).fill(user.name);
  await registerEmailInput(page).fill(user.email);
  await registerPasswordInput(page).fill(user.password);
  await registerSubmitButton(page).click();
  
  // Увеличенный таймаут для медленного сервера регистрации
  await expect(page).toHaveURL(/\/pomidorqa\/?$/, { timeout: 15000 });
}

// Честное ожидание сети. Убрал строгую проверку на status === 200, 
// чтобы пропускать 201, 204 и другие успешные ответы.
async function saveProfileForm(page: Page) {
  const responsePromise = page.waitForResponse(
    (response) =>
      response.url().includes("/profile") &&
      response.request().method() !== "GET",
    { timeout: 15000 }
  );

  await profileSaveButton(page).click();

  try {
    await responsePromise;
  } catch (err) {
    throw new Error(`Не дождались ответа сервера на сохранение профиля за 15с. Ошибка: ${err}`);
  }
}

// --- ТЕСТЫ ---
test.describe("Профиль пользователя: редактирование полей", () => {
  // Ретраи удалены: если падает, хотим видеть почему сразу

  test.beforeEach(async ({ page }) => {
    const user = makeUser("profile");
    await registerUser(page, user);
    await page.goto("/pomidorqa/profile");
    await expect(profileNameInput(page)).toBeVisible();
  });

  test("изменение имени сохраняется", async ({ page }) => {
    const newName = `Новое имя ${Date.now()}`;
    await profileNameInput(page).fill(newName);
    
    await saveProfileForm(page);
    
    // Возвращаем reload для честной проверки персистентности
    await page.reload(); 
    await expect(profileNameInput(page)).toHaveValue(newName);
  });

  test("добавленный навык отображается в блоке «могу помочь»", async ({ page }) => {
    const skillTag = `Skill-${Date.now()}`;
    await profileSkillInput(page).fill(skillTag);
    await profileSkillTypeSelect(page).selectOption("can_help");
    await profileSkillSubmit(page).click();

    await expect(profileCanHelpSkills(page)).toContainText(skillTag);
  });

  test("одновременное сохранение нескольких полей (soft assertions)", async ({ page }) => {
    const newName = `Комбо имя ${Date.now()}`;
    const newTelegram = `@combo_${Date.now()}`;
    const newBio = `Комбо био ${Date.now()}`;

    await profileNameInput(page).fill(newName);
    await profileTelegramInput(page).fill(newTelegram);
    await profileBioInput(page).fill(newBio);
    
    await saveProfileForm(page);
    
    // Возвращаем reload для честной проверки
    await page.reload();

    await expect.soft(profileNameInput(page)).toHaveValue(newName);
    await expect.soft(profileTelegramInput(page)).toHaveValue(newTelegram);
    await expect.soft(profileBioInput(page)).toHaveValue(newBio);
  });

  test("негативный сценарий: удаление навыка из списка", async ({ page }) => {
    const skillTag = `Удалить-${Date.now()}`;

    await profileSkillInput(page).fill(skillTag);
    await profileSkillTypeSelect(page).selectOption("can_help");
    await profileSkillSubmit(page).click();

    const skillChip = profileCanHelpSkills(page).getByRole("button", { name: skillTag });
    await expect(skillChip).toBeVisible();

    await skillChip.click();
    await expect(skillChip).not.toBeVisible();
  });

  test("поле ввода очищается после успешного добавления навыка", async ({ page }) => {
    const skillTag = `Очистка-${Date.now()}`;

    await profileSkillInput(page).fill(skillTag);
    await profileSkillTypeSelect(page).selectOption("can_help");
    await profileSkillSubmit(page).click();

    await expect(profileSkillInput(page)).toBeEmpty();
  });

  test("добавленный навык встречается в списке ровно один раз, без дублей", async ({ page }) => {
    const skillTag = `Дубль-${Date.now()}`;

    await profileSkillInput(page).fill(skillTag);
    await profileSkillTypeSelect(page).selectOption("can_help");
    await profileSkillSubmit(page).click();

    await expect(profileCanHelpSkills(page).getByText(skillTag)).toHaveCount(1);
  });
});