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
const slotsPage = "/pomidorqa/profile/slots";

// helpers
function formatDateTimeForInputs(now: Date = new Date()) {
  const day = String(now.getDate()).padStart(2, "0");
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const year = now.getFullYear();
  const hours = String(now.getHours()).padStart(2, "0");
  const minutes = String(now.getMinutes()).padStart(2, "0");
  return {
    dateForInput: `${year}-${month}-${day}`,
    timeForInput: `${hours}:${minutes}`,
  };
}


//register
const registerNameInput = (page: Page) => page.getByLabel("Имя");
const registerEmailInput = (page: Page) => page.getByLabel("Email");
const registerPasswordInput = (page: Page) => page.getByLabel("Пароль");
const registerSubmitButton = (page: Page) => page.getByRole("button", { name: "Зарегистрироваться" });

//profile
const profileNameInput = (page: Page) => page.getByLabel("Имя");
const profileSaveButton = (page: Page) => page.getByRole("button", { name: "Сохранить" });

//slots
const slotsAddButton = (page: Page) => page.getByRole("button", { name: "Добавить слот" });
const slotsDateInput = (page: Page) => page.getByLabel("Дата");
const slotsTimeInput = (page: Page) => page.getByLabel("Время начала");
const slotsCardForm = (page: Page) => page.locator("[data-slot-status='free']");

async function registerUser(page: Page, user: TestUser) {
  // хелпер подготовки: регистрация
  // сюда не класть проверяемое действие теста
  await page.goto(startPage);
  await registerNameInput(page).fill(user.name);
  await registerEmailInput(page).fill(user.email);
  await registerPasswordInput(page).fill(user.password);
  await registerSubmitButton(page).click();
  await expect(page).toHaveURL(/\/pomidorqa\/?$/);
}

test.describe("свой мир на каждый тест", () => {
  
  test.beforeEach(async ({ page }) => {
    // Arrange:
    // 1) новый пользователь из фабрики
    const runId = Date.now();
    const user = makeUser("peace", runId);
    // 2) регистрация через хелпер
    await registerUser(page, user);
    // 3) переход на страницу, где будет проверка
    await page.goto(profilePage);
  });

  test("мир 1: Изменение имени пользователя в профиле", async ({ page }) => {
    // Assert: одна мысль про сцену
    await profileNameInput(page).fill("Новое имя");
    const saved = page.waitForResponse(
      (r) => r.url() === "https://aiqa.su/pomidorqa/profile" && r.status() === 200
    );
    await profileSaveButton(page).click();
    await saved;
    await page.reload();
    await page.waitForLoadState('networkidle');
    await expect(profileNameInput(page)).toHaveValue("Новое имя");
  });

  test("мир 2: Добавление нового слота", async ({ page }) => {
    // Assert: другая мысль на той же сцене
    await page.goto(slotsPage);
    const { dateForInput, timeForInput } = formatDateTimeForInputs();
    await slotsDateInput(page).fill(dateForInput);
    await slotsTimeInput(page).fill(timeForInput);
    await slotsAddButton(page).click();
    await page.reload();
    await page.waitForLoadState('networkidle');
    await expect(slotsCardForm(page)).toBeVisible();
  });
});