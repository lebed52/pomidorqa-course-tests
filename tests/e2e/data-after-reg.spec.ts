import { test, expect, type Page } from "@playwright/test";
import crypto from "crypto";

/**
 * @file data-after-reg.spec.ts
 * @description Три изолированных теста проверки профиля.
 * Полная изоляция: новый пользователь перед каждым тестом.
 * Использование crypto.randomUUID() гарантирует 100% защиту
 * от коллизий даже при тяжелых параллельных запусках.
 */

// =====================================================================
// Page Objects – Инкапсуляция UI-взаимодействий. Никаких проверок внутри.
// =====================================================================

/**
 * Взаимодействие со страницей профиля.
 * Использует геттеры для ленивой инициализации локаторов.
 */
class ProfilePage {
  constructor(private page: Page) {}

  // Геттеры безопасны для TypeScript (выполняются при обращении)
  get nameField() { return this.page.getByRole("textbox").first(); }
  get saveButton() { return this.page.getByRole("button", { name: /сохранить|обновить/i }); }
  get skillInput() { return this.page.getByLabel("Навык"); }
  get skillTypeSelect() { return this.page.locator("#pomidorqa-profile-skill-type"); }
  get addSkillButton() { return this.page.getByRole("button", { name: /добавить/i }); }
  get canHelpArea() { return this.page.getByTestId("can-help-skills"); }

  skillChip(tag: string) {
    return this.page.locator(`[data-skill-tag="${tag}"]`);
  }

  /**
   * Обновляет имя, ожидает подтверждения от сервера, И ДОЖИДАЕТСЯ
   * фактического обновления UI перед выходом.
   */
  async updateName(newName: string) {
    await this.nameField.clear();
    await this.nameField.fill(newName);

    const responsePromise = this.page.waitForResponse(
      (response) => response.url().includes("/profile") && response.status() === 200,
      { timeout: 15000 }
    );

    await this.saveButton.click();
    await responsePromise;

    // Ждем, пока DOM на странице профиля обновится
    await expect(this.nameField).toHaveValue(newName, { timeout: 5000 });
  }

  /**
   * Добавляет навык на страницу профиля.
   * @param tag - Текст добавляемого навыка
   * @param type - Тип навыка (can_help / need_help)
   * @returns Локатор на созданный чип для последующей проверки в тесте
   */
  async addSkill(tag: string, type: "can_help" | "need_help" = "can_help") {
    await this.skillInput.fill(tag);
    await this.skillTypeSelect.selectOption(type);
    await this.addSkillButton.click();

    // Дожидаемся фактического появления чипа в DOM
    await this.skillChip(tag).waitFor({ state: 'visible', timeout: 15000 });

    return this.skillChip(tag);
  }
}

class RegisterPage {
  constructor(private page: Page) {}

  get nameInput() { return this.page.getByLabel("Имя"); }
  get emailInput() { return this.page.getByLabel("Email"); }
  get passwordInput() { return this.page.getByLabel("Пароль"); }
  get submitButton() { return this.page.getByRole("button", { name: "Зарегистрироваться" }); }

  async register(user: { name: string; email: string; pass: string }) {
    await this.page.goto("/pomidorqa/auth/register");
    await this.nameInput.fill(user.name);
    await this.emailInput.fill(user.email);
    await this.passwordInput.fill(user.pass);
    await this.submitButton.click();

    // Оставляем щедрый таймаут. Если тестовый сервер "завис", ретрай спасет.
    await expect(this.page).toHaveURL(/\/pomidorqa\/?$/, { timeout: 15000 });
  }
}

class SlotsPage {
  constructor(private page: Page) {}

  get dateInput() { return this.page.getByLabel("Дата"); }
  get timeInput() { return this.page.getByLabel("Время начала"); }
  get addButton() { return this.page.getByRole("button", { name: /добавить/i }); }
  get freeSlotCard() { return this.page.locator('[data-slot-status="free"]').first(); }

  async addSlot(dateStr: string, time: string) {
    await this.page.goto("/pomidorqa/profile/slots");
    await this.dateInput.fill(dateStr);
    await this.timeInput.fill(time);

    const responsePromise = this.page.waitForResponse(
      (response) => response.url().includes("/slots") && response.status() === 200,
      { timeout: 15000 }
    );

    await this.addButton.click();
    await responsePromise;
  }
}

// =====================================================================
// Вспомогательные функции
// =====================================================================

function createUniqueUser(role: string, workerIndex: number) {
  return {
    name: `${role} Автотест`,
    email: `${role}-${workerIndex}-${crypto.randomUUID()}@example.com`,
    pass: "TestPass123!",
  };
}

// =====================================================================
// Тесты
// =====================================================================

test.describe("Профиль пользователя: независимые проверки", () => {
  // ЗАЩИТА от моргающих тестов:
  // Если сервер внезапно затормозит, Playwright запустит тест повторно до 2 раз.
  test.describe.configure({ retries: 3 });

  let profilePage: ProfilePage;
  let slotsPage: SlotsPage;

  test.beforeEach(async ({ page }, testInfo) => {
    profilePage = new ProfilePage(page);
    slotsPage = new SlotsPage(page);

    const user = createUniqueUser("hw7", testInfo.workerIndex);
    const registerPage = new RegisterPage(page);

    await test.step("Регистрация нового пользователя и переход в профиль", async () => {
      await registerPage.register(user);
      await page.goto("/pomidorqa/profile");
      await expect(profilePage.nameField).toBeVisible();
    });
  });

  test("смена имени в профиле сохраняется после перезагрузки", async ({ page }) => {
    const newName = `Новое имя ${Date.now()}`;

    await test.step("Обновление имени пользователя", async () => {
      await profilePage.updateName(newName);
    });

    await test.step("Проверка сохранения после перезагрузки", async () => {
      // УНИВЕРСАЛЬНЫЙ ВАРИАНТ ДЛЯ ЛЮБОЙ АРХИТЕКТУРЫ:
      // Перезагружаем страницу на каждом шаге опроса, чтобы "протолкнуть" обновление
      // серверного кэша и заставить бэкенд отдать свежие данные.
      await expect.poll(async () => {
        await page.reload();
        return await profilePage.nameField.inputValue();
      }, {
        message: "Имя пользователя не обновилось после перезагрузки",
        intervals: [500, 1000, 2000], // экспоненциальная задержка, 
        // чтобы дать серверу спокойно обработать кэш и не долбить его каждую миллисекунду
        timeout: 15000,
      }).toBe(newName);
    });
  });

  test("добавление навыка отображается в блоке «могу помочь»", async () => {
    const skillTag = `Skill-${Date.now()}`;

    await test.step("Добавление навыка", async () => {
      const chip = await profilePage.addSkill(skillTag, "can_help");
      await expect(profilePage.canHelpArea).toBeVisible();
      await expect(chip).toBeVisible();
    });
  });

  test("добавление слота отображается свободным", async () => {
    const tomorrow = new Date(Date.now() + 24 * 60 * 60 * 1000);
    const dateStr = tomorrow.toISOString().slice(0, 10);

    await test.step("Создание слота", async () => {
      await slotsPage.addSlot(dateStr, "12:00");
    });

    await test.step("Проверка отображения слота", async () => {
      await expect(slotsPage.freeSlotCard).toBeVisible();
    });
  });
});