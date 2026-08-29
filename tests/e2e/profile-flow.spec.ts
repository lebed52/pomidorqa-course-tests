import { test, expect } from "@playwright/test";
import { makeUser, registerUser } from "./helpers/user";
import { locators as l } from "./pages/profile-page";

// НАСТРОЙКА ПЕРЕД КАЖДЫМ ТЕСТОМ (Arrange)

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

  // Тест 1: Смена имени в профиле
  test("Смена имени в профиле", async ({ page }) => {
    const newName = `Новое имя ${Date.now()}`;

    // Act: меняем имя
    await l.nameInput(page).fill(newName);
    await l.saveButton(page).click();

    // Assert: проверяем, что имя изменилось
    await expect(l.nameInput(page)).toHaveValue(newName);
  });

  // Тест 2: пишем Телеграм

  test("Пишем Телеграмм", async ({ page }) => {
    const newTelegram = `@test_${Date.now()}`;
    const telegramInput = l.telegramInput(page);

    // Act: пишем Телеграм
    await expect(telegramInput).toBeVisible();
    await telegramInput.clear(); //удаляем данные, чтобы убедиться, что поле пустое
    await telegramInput.fill(newTelegram); // вводим текст сразу, без эмуляции нажатия клавиш
    await l.saveButton(page).click();

    // Assert: проверяем, что Телеграм появился
    await expect(telegramInput).toHaveValue(newTelegram);
  });

  // Тест 3: пишем Часовой пояс

  test("Пишем Часовой пояс", async ({ page }) => {
    const timezone = "Asia/Irkutsk";
    const timezoneSelect = l.timezoneSelect(page);
    // 1. Проверяем, что список видим
    await expect(timezoneSelect).toBeVisible();
    // 2. Выбираем значение по видимому тексту
    await timezoneSelect.selectOption({ label: timezone });
    // 3. Проверяем, что выбралось правильное значение
    await expect(timezoneSelect).toHaveValue(timezone);
  });

  // Тест 4: пишем О себе

  test("Пишем О себе", async ({ page }) => {
    const newAboutme = `Я смогу сделать автотест сама ${Date.now()}`;
    const aboutInput = l.aboutInput(page);

    // Act: пишем о себе
    await expect(aboutInput).toBeVisible();
    await aboutInput.clear();
    await aboutInput.fill(newAboutme);
    await l.saveButton(page).click();

    // Assert: проверяем, что инфа обо мне появилась
    await expect(l.aboutInput(page)).toHaveValue(newAboutme);
  });

  // Тест 5: Добавление навыка

  test("Добавление навыка", async ({ page }) => {
    // Arrange (уже сделано в beforeEach)
    const skillTag = `Навык-${Date.now()}`;

    // Act: добавляем навык
    await l.skillInput(page).fill(skillTag);
    await l.skillTypeSelect(page).selectOption("can_help");
    await l.addSkillButton(page).click();

    // Assert: проверяем, что навык появился в списке "Могу помочь"
    await expect(l.canHelpSkills(page)).toContainText(skillTag);
  });

  // Тест 6: Добавление навыка с типом Хочу разобрать

  test("Добавление навыка с типом Хочу разобрать", async ({ page }) => {
    // Arrange (уже сделано в beforeEach)
    const skillTag = `Навык-${Date.now()}`;

    // Act: добавляем навык
    await l.skillInput(page).fill(skillTag);
    await l.skillTypeSelect(page).selectOption("want_to_learn");
    await l.addSkillButton(page).click();

    // Assert: проверяем, что навык появился в списке "Хочу разобрать"
    await expect(l.wantToLearnSkills(page)).toContainText(skillTag);
  });

  // Тест 7: Удаление навыка

  test("Удаление навыка", async ({ page }) => {
    // Arrange: создаем навык, который будем удалять
    const skillTagToDelete = `Навык-для-удаления-${Date.now()}`;

    // Добавляем навык
    await l.skillInput(page).fill(skillTagToDelete);
    await l.skillTypeSelect(page).selectOption("can_help");
    await l.addSkillButton(page).click();

    // Проверяем, что навык появился
    await expect(l.canHelpSkills(page)).toContainText(skillTagToDelete);

    // Act: удаляем навык — кликаем по кнопке "×" на чипе
    await l.removeSkillButton(page, skillTagToDelete).click();

    // Assert: проверяем, что навык исчез (чипа больше нет в DOM)
    await expect(l.skillChip(page, skillTagToDelete)).toHaveCount(0);
  });

  // ТЕСТ 8: Проверяем, что нельзя добавить пустой навык
  test("Нельзя добавить пустой навык", async ({ page }) => {
    // Act: пытаемся добавить навык без заполнения поля
    await l.skillTypeSelect(page).selectOption("can_help");
    await l.addSkillButton(page).click();

    // Assert: проверяем, что навык НЕ добавился
    await expect(l.skillInput(page)).toHaveValue("");

    // Проверяем, что ни одного навыка нет на странице
    await test.step("Ни одного навыка не появилось", async () => {
      await expect(l.anyNewSkill(page)).not.toBeVisible();
    });
  });
});
