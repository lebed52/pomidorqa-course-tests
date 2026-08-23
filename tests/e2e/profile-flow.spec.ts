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
    const nameInput = page.getByRole("textbox", { name: "Имя" });

    // Act: меняем имя
    await page.getByLabel('Имя').fill(newName);
    await page.getByRole("button", { name: "Сохранить" }).click();

    // Assert: проверяем, что имя изменилось
    await expect(page.getByRole("textbox", { name: "Имя" })).toHaveValue(newName);
  });


 // Тест 2: пишем Телеграм
 
  test("Пишем Телеграмм", async ({ page }) => {
    const newTelegram = `@test_${Date.now()}`;
    const telegramInput = page.getByRole("textbox", { name: "Telegram" });
    
    // Act: пишем Телеграм
    
    await expect(telegramInput).toBeVisible(); 
    await telegramInput.clear(); //удаляем данные, чтобы убедиться, что поле пустое
    await telegramInput.fill(newTelegram); // вводим текст сразу, без эмуляции нажатия клавиш
    await page.getByRole("button", { name: "Сохранить" }).click();

    // Assert: проверяем, что Телеграм появился
    await expect(telegramInput).toHaveValue(newTelegram);
  });

 // Тест 3: пишем Часовой пояс

  test("Пишем Часовой пояс", async ({ page }) => {
    const timezone = "Europe/Moscow";
    // 1. Находим выпадающий список (это select/combobox)
    const timezoneSelect = page.getByRole("combobox", { name: "Часовой пояс" });
    // 2. Проверяем, что он видим
  await expect(timezoneSelect).toBeVisible();
    // 3. Выбираем значение по видимому тексту
  await timezoneSelect.selectOption({ label: "Europe/Moscow" });
   // 4. Нажимаем "Сохранить" (если нужно)
  await page.getByRole("button", { name: "Сохранить" }).click();
  // 5. Проверяем, что выбралось правильное значение
  await expect(timezoneSelect).toHaveValue("Europe/Moscow");
  });


// Тест 4: пишем О себе

test("Пишем О себе", async ({ page }) => {
     const newAboutme = `Я смогу сделать автотест сама ${Date.now()}`;
     const aboutInput = page.getByRole("textbox", { name: "О себе" });
     // Act: пишем о себе
    
    await expect(aboutInput).toBeVisible();
    await aboutInput.clear();
    await aboutInput.fill(newAboutme);
    await page.getByRole("button", { name: "Сохранить" }).click();

    // Assert: проверяем, что инфа обо мне появилась

    await expect(page.getByRole('textbox', { name: 'О себе' })).toHaveValue(newAboutme);

    // Assert: проверяем, что все поля заполнились

    await expect(page.getByRole("textbox", { name: "Имя" })).toBeVisible();
    await expect(page.getByRole("textbox", { name: "Telegram" })).toBeVisible();
    await expect(page.getByRole("combobox", { name: "Часовой пояс" })).toHaveValue("Europe/Moscow");
    await expect(page.getByRole("textbox", { name: "О себе" })).toHaveValue(newAboutme);
  });

  // Тест 5: Добавление навыка
  test("Добавление навыка", async ({ page }) => {
    // Arrange (уже сделано в beforeEach)
    const skillTag = `Навык-${Date.now()}`;
    const aboutInput = page.getByLabel('Тип').selectOption("can_help");

    // Act: добавляем навык
    await page.getByText("Навык", {exact: true}).fill(skillTag);
    await page.getByLabel('Тип').selectOption("can_help");
    await page.getByRole("button", { name: "Добавить" }).click();

    // Assert: проверяем, что навык появился
    await expect(page.getByRole('textbox', {name: 'Навык'})).toBeVisible();
  });
});



