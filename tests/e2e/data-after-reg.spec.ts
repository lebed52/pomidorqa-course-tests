import { test, expect, type Page } from "@playwright/test";

// 1. ВСПОМОГАТЕЛЬНЫЕ ФУНКЦИИ (вынесены наверх для удобства)

// Функция, которая создает объект пользователя с уникальными данными
function makeUser(role: string, runId: number) {
  return {
    name: `${role} Автотест`,
    email: `${role}-${runId}@example.com`,
    password: "testpass123",
  };
}

// Функция для регистрации пользователя (переиспользуется во всех тестах)
async function registerUser(page: Page, user: { name: string; email: string; password: string }) {
  await page.goto("/pomidorqa/auth/register");
  await page.getByRole("textbox", { name: "Имя" }).fill(user.name);
  await page.getByRole("textbox", { name: "Email" }).fill(user.email);
  await page.getByLabel("Пароль").fill(user.password);
  await page.getByRole("button", { name: "Зарегистрироваться" }).click();
  await expect(page).toHaveURL(/\/pomidorqa\/?$/);
}

// 2. НАСТРОЙКА ПЕРЕД КАЖДЫМ ТЕСТОМ (Arrange) 

test.describe("Тесты профиля пользователя", () => {
  // Эта переменная будет уникальной для каждого теста
  let runId: number;
  let user: ReturnType<typeof makeUser>;

  // beforeEach выполняется ПЕРЕД КАЖДЫМ тестом
  test.beforeEach(async ({ page }) => {
    // 1. Генерируем уникальный ID для этого теста
    runId = Date.now();
    // 2. Создаем пользователя с уникальными данными
    user = makeUser("testuser", runId);
    // 3. Регистрируем пользователя
    await registerUser(page, user);
    // 4. Переходим в профиль (это общее действие для всех тестов)
    await page.goto("/pomidorqa/profile");
  });

  // 3. ТРИ НЕЗАВИСИМЫХ ТЕСТА 

  // Тест 1: Смена имени в профиле
  test("Смена имени в профиле", async ({ page }) => {
    // Arrange (уже сделано в beforeEach)
    const newName = `Новое имя ${Date.now()}`;

    // Act: меняем имя
    await page.getByText("Имя").fill(newName);
    await page.getByRole("button", { name: "Сохранить" }).click();

    // Assert: проверяем, что имя изменилось
    await expect(page.getByRole("textbox", { name: "Имя" })).toHaveValue(newName);
  });

  // Тест 2: Добавление навыка
  test("Добавление навыка", async ({ page }) => {
    // Arrange (уже сделано в beforeEach)
    const skillTag = `Навык-${Date.now()}`;

    // Act: добавляем навык
    await page.getByText("Навык", {exact: true}).fill(skillTag);
    await page.getByLabel('ТипМогу помочьХочу разобрать').selectOption("can_help");
    await page.getByRole("button", { name: "Добавить" }).click();

    // Assert: проверяем, что навык появился
    await expect(page.getByRole('textbox', {name: 'Навык'})).toBeVisible();
  });

  // Тест 3: Добавление слота
  test("Добавление слота", async ({ page }) => {
    // Arrange (уже сделано в beforeEach)
    const tomorrow = new Date(Date.now() + 24 * 60 * 60 * 1000);
    const date = tomorrow.toISOString().slice(0, 10);

    // Act: добавляем слот
    await page.goto("/pomidorqa/profile/slots");
    await page.getByRole('textbox', { name:'Дата'}).fill(date);
    await page.getByRole('textbox', { name:"Время начала"}).fill("12:00");
    await page.getByRole("button", { name: "Добавить слот" }).click();

    // Assert: проверяем, что слот появился
    await expect(page.getByText('ср, 19 авг., 12:00свободенУдалить')).toBeVisible();
  });
});