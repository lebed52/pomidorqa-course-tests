import { test, expect, type Page } from "@playwright/test";

// Урок 8, Act: действия с полями профиля.
// Сцена (Arrange) одна на все тесты — зарегистрированный пользователь на своей странице профиля.
// Проверяем именно действие: ввод, выбор, нажатие.
// makeUser / registerUser / beforeEach скопированы из data-after-reg.spec.ts:
// тот файл по условию ДЗ трогать нельзя, общий хелпер появится на Уроке 10.

const ROUTES = {
  register: "/pomidorqa/auth/register",
  profile: "/pomidorqa/profile",
};

// ─────────────────────────────────────────────────────────────
// Локаторы
// ─────────────────────────────────────────────────────────────

// Регистрация
const registerNameInput = (page: Page) => page.getByLabel("Имя");
const registerEmailInput = (page: Page) => page.getByLabel("Email");
const registerPasswordInput = (page: Page) => page.getByLabel("Пароль");
const registerSubmitButton = (page: Page) => page.getByRole("button", { name: "Зарегистрироваться" });

// Профиль: верхняя форма, все поля сохраняются одной кнопкой
const profileNameInput = (page: Page) => page.getByLabel("Имя");
const profileTelegramInput = (page: Page) => page.getByLabel("Telegram");
const profileTimezoneSelect = (page: Page) => page.getByLabel("Часовой пояс");
const profileBioInput = (page: Page) => page.getByLabel("О себе");
const profileSaveButton = (page: Page) => page.getByRole("button", { name: "Сохранить" });

// Профиль: нижняя форма «Навыки», у неё своя кнопка
const skillInput = (page: Page) => page.locator("#pomidorqa-profile-skill-input");
const skillTypeSelect = (page: Page) => page.locator("#pomidorqa-profile-skill-type");
const addSkillButton = (page: Page) => page.getByRole("button", { name: "Добавить" });
const canHelpSkills = (page: Page) => page.getByTestId("can-help-skills");
const skillChips = (page: Page) => page.locator("[data-skill-tag]");
const skillChip = (page: Page, tag: string) => page.locator(`[data-skill-tag="${tag}"]`);

// ─────────────────────────────────────────────────────────────
// Фабрики и общие действия
// ─────────────────────────────────────────────────────────────

type TestUser = {
  name: string;
  email: string;
  password: string;
};

function makeUser(role: string, runId: number): TestUser {
  return {
    name: `${role} Автотест`,
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

// Сохранение профиля уходит POST-ом на адрес самой страницы, а признака успеха
// в интерфейсе нет: кнопка не меняется, сообщения не появляется. Поэтому ждём
// ответ сервера. Промис создаём до клика — иначе ответ придёт раньше, чем мы
// начнём его слушать, и ожидание повиснет.
async function saveProfile(page: Page) {
  const saved = page.waitForResponse(
    (response) => response.url().endsWith(ROUTES.profile) && response.request().method() === "POST"
  );
  await profileSaveButton(page).click();
  await saved;
}

// ─────────────────────────────────────────────────────────────

test.describe("Профиль: действия с полями", () => {
  // Свой мир под каждый тест: новый пользователь, чистый профиль.
  test.beforeEach(async ({ page }) => {
    const user = makeUser("hw8", Date.now());
    await registerUser(page, user);
    await page.goto(ROUTES.profile);
  });

  test("имя: вводим новое и сохраняем", async ({ page }) => {
    const newName = `Тимур Тестович ${Date.now()}`;

    await test.step("Заполняем поле и сохраняем", async () => {
      await profileNameInput(page).fill(newName);
      await saveProfile(page);
    });

    await test.step("После перезагрузки имя пришло с сервера", async () => {
      await page.reload();
      await expect(profileNameInput(page)).toHaveValue(newName);
    });
  });

test("негатив: имя не сохраняется без нажатия «Сохранить»", async ({ page }) => {
  const newName = `Несохранённое имя ${Date.now()}`;

  await test.step("Меняем имя, но не сохраняем", async () => {
    await profileNameInput(page).fill(newName);
    await expect(profileNameInput(page)).toHaveValue(newName);
  });

  await test.step("Перезагружаем страницу и проверяем, что новое имя не сохранилось", async () => {
    await page.reload();

    await expect(profileNameInput(page)).not.toHaveValue(newName);
  });
});

  test("часовой пояс: выбираем из списка", async ({ page }) => {
    // По умолчанию стоит Europe/Moscow — берём заведомо другой,
    // иначе проверка прошла бы и без всякого выбора.
    const timezone = "Asia/Yekaterinburg";

    await test.step("Выбираем часовой пояс и сохраняем", async () => {
      await expect(profileTimezoneSelect(page)).toHaveValue("Europe/Moscow");
      await profileTimezoneSelect(page).selectOption(timezone);
      await saveProfile(page);
    });

    await test.step("После перезагрузки выбран новый пояс", async () => {
      await page.reload();
      await expect(profileTimezoneSelect(page)).toHaveValue(timezone);
    });
  });

test("часовой пояс: сохраняется после повторного открытия профиля", async ({ page }) => {
  const timezone = "Asia/Omsk";

  await test.step("Меняем часовой пояс и сохраняем", async () => {
    await profileTimezoneSelect(page).selectOption(timezone);
    await saveProfile(page);

    await expect(profileTimezoneSelect(page)).toHaveValue(timezone);
  });

  await test.step("Уходим со страницы и снова открываем профиль", async () => {
    await page.goto("/pomidorqa");
    await page.goto("/pomidorqa/profile");

    await expect(profileTimezoneSelect(page)).toHaveValue(timezone);
  });
});

  test("telegram: заполняем пустое поле", async ({ page }) => {
    const telegram = `@qa_timur_cat${Date.now()}`;

    await test.step("Заполняем Telegram и сохраняем", async () => {
      await expect(profileTelegramInput(page)).toHaveValue("");
      await profileTelegramInput(page).fill(telegram);
      await saveProfile(page);
    });

    await test.step("После перезагрузки Telegram пришёл с сервера", async () => {
      await page.reload();
      await expect(profileTelegramInput(page)).toHaveValue(telegram);
    });
  });
  
  test("telegram: можно очистить сохранённое значение", async ({ page }) => {
  const telegram = `@qa_${Date.now()}`;

  await test.step("Сначала сохраняем Telegram", async () => {
    await profileTelegramInput(page).fill(telegram);
    await saveProfile(page);

    await page.reload();
    await expect(profileTelegramInput(page)).toHaveValue(telegram);
  });

  await test.step("Очищаем Telegram и сохраняем", async () => {
    await profileTelegramInput(page).fill("");
    await saveProfile(page);

    await page.reload();
    await expect(profileTelegramInput(page)).toHaveValue("");
  });
});

  test("о себе: заполняем многострочное поле", async ({ page }) => {
    const bio = `QA-инженер, прогон ${Date.now()}. Пытаюсь разобраться в Playwright.`;

    await test.step("Заполняем «О себе» и сохраняем", async () => {
      await profileBioInput(page).fill(bio);
      await saveProfile(page);
    });

    await test.step("После перезагрузки текст пришёл с сервера", async () => {
      await page.reload();
      await expect(profileBioInput(page)).toHaveValue(bio);
    });
  });

  test("навык: заполняем, выбираем тип и добавляем", async ({ page }) => {
    const skillTag = `Playwright-demo-${Date.now()}`;

    // Комбо из трёх действий: ввод, выбор в списке, нажатие.
    // У этой формы своя кнопка «Добавить», к верхнему «Сохранить» она отношения не имеет.
    await test.step("Добавляем навык «могу помочь»", async () => {
      await skillInput(page).fill(skillTag);
      await skillTypeSelect(page).selectOption("can_help");
      await addSkillButton(page).click();
    });

    await test.step("Навык появился в блоке «могу помочь»", async () => {
      await expect(canHelpSkills(page)).toContainText(skillTag);
    });
  });

  test("негатив: пустой навык не добавляется", async ({ page }) => {
    await test.step("Жмём «Добавить», не заполнив поле", async () => {
      await expect(skillInput(page)).toHaveValue("");
      await addSkillButton(page).click();
    });

    await test.step("Ни одного навыка не появилось", async () => {
      // Поле навыка помечено required — браузер не даёт отправить форму.
      // Проверяем именно результат: чипов ноль и блока «могу помочь» нет,
      // а не «клик прошёл и ладно».
      await expect(skillChips(page)).toHaveCount(0);
      await expect(canHelpSkills(page)).not.toBeVisible();
    });
  });

  test("негатив: навык «хочу разобрать» не попадает в блок «могу помочь»", async ({ page }) => {
    const runId = Date.now();
    const canHelpTag = `CanHelp-${runId}`;
    const wantToLearnTag = `WantToLearn-${runId}`;

    await test.step("Добавляем навык «могу помочь»", async () => {
      await skillInput(page).fill(canHelpTag);
      await skillTypeSelect(page).selectOption("can_help");
      await addSkillButton(page).click();
      await expect(skillChip(page, canHelpTag)).toBeVisible();
    });

    await test.step("Добавляем навык «хочу разобрать»", async () => {
      await skillInput(page).fill(wantToLearnTag);
      await skillTypeSelect(page).selectOption("want_to_learn");
      await addSkillButton(page).click();
      await expect(skillChip(page, wantToLearnTag)).toBeVisible();
    });

    await test.step("Навыки разошлись по своим блокам", async () => {
      await expect(skillChips(page)).toHaveCount(2);
      await expect(canHelpSkills(page)).toContainText(canHelpTag);
      // Главная проверка теста: второй навык добавлен, но в «могу помочь» его нет.
      await expect(canHelpSkills(page)).not.toContainText(wantToLearnTag);
    });
  });

  test("форма профиля: три поля сохраняются за один раз", async ({ page }) => {
    const runId = Date.now();
    const name = `Тимур Тестовый ${runId}`;
    const telegram = `@qa_timur_${runId}`;
    const bio = `QA-инженер, прогон ${runId}. Проверяю форму профиля целиком.`;

    await test.step("Заполняем Имя, Telegram и «О себе», сохраняем разом", async () => {
      await profileNameInput(page).fill(name);
      await profileTelegramInput(page).fill(telegram);
      await profileBioInput(page).fill(bio);
      await saveProfile(page);
    });

    await test.step("После перезагрузки все три значения пришли с сервера", async () => {
      await page.reload();
      // expect.soft не останавливает тест на первой неудаче: если поедут
      // два поля из трёх, увидим оба сразу, а не по одному за прогон.
      await expect.soft(profileNameInput(page)).toHaveValue(name);
      await expect.soft(profileTelegramInput(page)).toHaveValue(telegram);
      await expect.soft(profileBioInput(page)).toHaveValue(bio);
    });
  });
});
