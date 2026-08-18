import { test as base, expect, type Page } from "@playwright/test";
import crypto from "crypto";

/**
 * @file data-after-reg.spec.ts
 * @description Урок 7: независимость тестов. Три изолированных теста поверх
 * свежезарегистрированного пользователя — смена имени, добавление навыка,
 * добавление слота. Page Object Model поверх Playwright-фикстур.
 *
 * Статус локаторов:
 * ---------------------------------------------------------------------------
 * ✅ Регистрация, добавление навыка, добавление слота — те же голые
 *    локаторы, что в booking-flow.spec.ts, уже подтверждены зелёным
 *    прогоном на этих же страницах (/profile и /profile/slots).
 * ⚠️ Смена имени — новый флоу: nameField грунтуется на подтверждённом факте
 *    (лейбл "Имя" точно есть на сайте, видели на регистрации), а не на
 *    позиции элемента в DOM. saveButton и URL-паттерны в waitForResponse —
 *    обоснованные, но непроверенные предположения. Сверить в DevTools перед
 *    PR (см. also секцию про retries/waitForResponse в описании PR).
 * ---------------------------------------------------------------------------
 *
 * POMIDORQA_BASE_URL=http://localhost:3000 npx playwright test --project=e2e tests/e2e/data-after-reg.spec.ts
 */

// =====================================================================
// ТИПЫ
// =====================================================================

type TestUser = {
  name: string;
  email: string;
  pass: string;
};

// =====================================================================
// PAGE OBJECTS
// =====================================================================

class RegisterPage {
  constructor(private page: Page) {}

  get nameInput() { return this.page.getByLabel("Имя"); }
  get emailInput() { return this.page.getByLabel("Email"); }
  get passwordInput() { return this.page.getByLabel("Пароль"); }
  get submitButton() { return this.page.getByRole("button", { name: "Зарегистрироваться" }); }

  async register(user: TestUser) {
    await this.page.goto("/pomidorqa/auth/register");
    await this.nameInput.fill(user.name);
    await this.emailInput.fill(user.email);
    await this.passwordInput.fill(user.pass);
    await this.submitButton.click();
    await expect(this.page).toHaveURL(/\/pomidorqa\/?$/, { timeout: 15000 });
  }
}

class ProfilePage {
  constructor(private page: Page) {}

  // nameField грунтуется на подтверждённом факте: лейбл "Имя" точно есть на
  // сайте (видели на регистрации), а не на позиции элемента в DOM. .last() —
  // подстраховка на случай пары совпадений на /profile.
  get nameField() { return this.page.getByLabel("Имя").last(); }
  get saveButton() { return this.page.getByRole("button", { name: /сохранить|обновить/i }); }
  get skillInput() { return this.page.getByLabel("Навык"); }
  get skillTypeSelect() { return this.page.locator("#pomidorqa-profile-skill-type"); }
  get addSkillButton() { return this.page.getByRole("button", { name: /добавить/i }); }
  get canHelpArea() { return this.page.getByTestId("can-help-skills"); }

  skillChip(tag: string) {
    return this.page.locator(`[data-skill-tag="${tag}"]`);
  }

  async updateName(newName: string) {
    await this.nameField.fill(newName);

    // Подписываемся на ответ ДО клика, чтобы не пропустить быстрый ответ.
    // Фильтр по методу — не только по URL: GET-запрос к тому же /profile
    // (например, случайный refetch) не должен считаться подтверждением
    // сохранения, нужен именно ответ на мутацию.
    const responsePromise = this.page.waitForResponse(
      (response) =>
        response.url().includes("/profile") &&
        response.request().method() !== "GET" &&
        response.status() === 200,
      { timeout: 15000 }
    );

    await this.saveButton.click();

    try {
      await responsePromise;
    } catch (err) {
      throw new Error(
        "Не дождались успешного ответа сервера на сохранение имени за 15с. " +
          "Возможная причина: запрос сохранения бьёт не в путь, содержащий " +
          "'/profile' — сверить реальный endpoint в DevTools (Network) перед " +
          `тем, как считать это флейком. Исходная ошибка: ${err}`
      );
    }

    await expect(this.nameField).toHaveValue(newName, { timeout: 5000 });
  }

  async addSkill(tag: string, type: "can_help" | "need_help" = "can_help") {
    await this.skillInput.fill(tag);
    await this.skillTypeSelect.selectOption(type);
    await this.addSkillButton.click();

    const chip = this.skillChip(tag);
    await chip.waitFor({ state: "visible", timeout: 15000 });
    return chip;
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
      (response) =>
        response.url().includes("/slots") &&
        response.request().method() !== "GET" &&
        response.status() === 200,
      { timeout: 15000 }
    );

    await this.addButton.click();

    try {
      await responsePromise;
    } catch (err) {
      throw new Error(
        "Не дождались успешного ответа сервера на создание слота за 15с. " +
          "Возможная причина: запрос создания бьёт не в путь, содержащий " +
          `'/slots' — сверить реальный endpoint в DevTools. Исходная ошибка: ${err}`
      );
    }
  }
}

// =====================================================================
// ФИКСТУРЫ — вместо describe-scope `let`: инициализация гарантируется
// Playwright для каждого теста, без ручного контракта "успеет ли beforeEach"
// =====================================================================

type Fixtures = {
  registerPage: RegisterPage;
  profilePage: ProfilePage;
  slotsPage: SlotsPage;
};

const test = base.extend<Fixtures>({
  registerPage: async ({ page }, use) => {
    await use(new RegisterPage(page));
  },
  profilePage: async ({ page }, use) => {
    await use(new ProfilePage(page));
  },
  slotsPage: async ({ page }, use) => {
    await use(new SlotsPage(page));
  },
});

// =====================================================================
// ГЕНЕРАЦИЯ ПОЛЬЗОВАТЕЛЯ
// =====================================================================

function createUniqueUser(role: string, workerIndex: number): TestUser {
  return {
    name: `${role} Автотест`,
    email: `${role}-${workerIndex}-${crypto.randomUUID()}@example.com`,
    pass: "TestPass123!",
  };
}

// =====================================================================
// ТЕСТЫ
// =====================================================================

test.describe("Профиль пользователя: независимые проверки", () => {
  // retries — осознанный компромисс в пользу устойчивости CI к сетевым лагам
  // стенда, а не бесплатная опция: ретрай маскирует нестабильный тест точно
  // так же, как маскирует настоящий сбой. Перед PR сверяться с HTML-репортом
  // Playwright — сколько попыток реально потребовалось на зелёный прогон.
  test.describe.configure({ retries: 3 });

  test.beforeEach(async ({ page, registerPage, profilePage }, testInfo) => {
    const user = createUniqueUser("hw7", testInfo.workerIndex);

    await test.step("Регистрация нового пользователя и переход в профиль", async () => {
      await registerPage.register(user);
      await page.goto("/pomidorqa/profile");
      await expect(profilePage.nameField).toBeVisible();
    });
  });

  test("смена имени в профиле сохраняется после перезагрузки", async ({ page, profilePage }) => {
    const newName = `Новое имя ${Date.now()}`;

    await test.step("Обновление имени пользователя", async () => {
      await profilePage.updateName(newName);
    });

    await test.step("Проверка сохранения после перезагрузки", async () => {
      await expect
        .poll(
          async () => {
            await page.reload();
            return profilePage.nameField.inputValue();
          },
          {
            message: "Имя пользователя не обновилось после перезагрузки",
            intervals: [500, 1000, 2000],
            timeout: 15000,
          }
        )
        .toBe(newName);
    });
  });

  test("добавление навыка отображается в блоке «могу помочь»", async ({ profilePage }) => {
    const skillTag = `Skill-${Date.now()}`;

    await test.step("Добавление навыка", async () => {
      const chip = await profilePage.addSkill(skillTag, "can_help");
      await expect(profilePage.canHelpArea).toBeVisible();
      await expect(chip).toBeVisible();
    });
  });

  test("добавление слота отображается свободным", async ({ slotsPage }) => {
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