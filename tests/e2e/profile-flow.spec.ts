import { test, expect, type Page } from "@playwright/test";

// ДЗ Урока 8: Act — действия с полями профиля.
// ДЗ Урока 9: дописаны ещё три — «хочу разобраться», смена telegram, удаление навыка.
// Arrange — зарегистрированный пользователь на своей странице профиля;
// makeUser / registerUser / beforeEach скопированы из ДЗ-7.
// Проверяем именно действие: ввод, выбор из списка, нажатие.

const PAGES = {
  register: "/pomidorqa/auth/register",
  profile: "/pomidorqa/profile",
} as const;

// ── Локаторы: функция от страницы, чтобы не привязываться к одной вкладке ──

// Регистрация
const regName = (page: Page) => page.getByLabel("Имя");
const regEmail = (page: Page) => page.getByLabel("Email");
const regPassword = (page: Page) => page.getByLabel("Пароль");
const regSubmit = (page: Page) =>
  page.getByRole("button", { name: "Зарегистрироваться" });

// Профиль: верхняя форма, все поля сохраняются одной кнопкой
const profileName = (page: Page) => page.getByLabel("Имя");
const profileTimezone = (page: Page) => page.getByLabel("Часовой пояс");
const profileTelegram = (page: Page) => page.getByLabel("Telegram");
const profileBio = (page: Page) => page.getByLabel("О себе");
const saveProfile = (page: Page) =>
  page.getByRole("button", { name: "Сохранить" });

// Профиль: блок «Навыки» — нижняя форма со своей кнопкой
const skillInput = (page: Page) => page.getByLabel("Навык");
const skillType = (page: Page) => page.getByLabel("Тип");
const addSkill = (page: Page) => page.getByRole("button", { name: "Добавить" });
const canHelpSkills = (page: Page) => page.getByTestId("can-help-skills");

// Профиль: блок «Хочу разобраться» — второй тип навыка.
// У этого блока нет data-testid (в отличие от «могу помочь»), якорь — data-skills.
const wantToLearnSkills = (page: Page) =>
  page.locator('[data-skills="want_to_learn"]');

// Чип навыка: кнопка с именем навыка внутри блока «могу помочь»
const skillChip = (page: Page, skill: string) =>
  canHelpSkills(page).getByRole("button", { name: skill });

// ── Фабрика тестовых данных ──

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

// ── Хелпер подготовки: только шаги регистрации, без проверяемых действий ──

async function registerUser(page: Page, user: TestUser) {
  await page.goto(PAGES.register);
  await regName(page).fill(user.name);
  await regEmail(page).fill(user.email);
  await regPassword(page).fill(user.password);
  await regSubmit(page).click();
  await expect(page).toHaveURL(/\/pomidorqa\/?$/);
}

// ── Хелпер сохранения: общий для всех полей верхней формы ──

// Признака успеха в UI нет: сохранение уходит POST-ом на адрес профиля.
// Промис вешаем до клика — иначе ответ придёт раньше, чем начнём слушать.
async function saveProfileAndWait(page: Page) {
  const saved = page.waitForResponse(
    (r) => r.url().endsWith(PAGES.profile) && r.request().method() === "POST"
  );
  await saveProfile(page).click();
  await saved;
}

// ── Тесты ──

test.describe("профиль: действия с полями", () => {
  let user: TestUser;

  test.beforeEach(async ({ page }) => {
    // Arrange: свой мир на каждый тест — новый пользователь и чистый профиль.
    user = makeUser("hw8", Date.now());
    await registerUser(page, user);
    await page.goto(PAGES.profile);
  });

  test("имя меняем и сохраняем", async ({ page }) => {
    const newName = `Имя Act ${Date.now()}`;

    await test.step("В поле пока лежит имя с регистрации", async () => {
      await expect(profileName(page)).toHaveValue(user.name);
    });

    await test.step("Вводим новое имя и сохраняем", async () => {
      await profileName(page).fill(newName);
      await saveProfileAndWait(page);
    });

    await test.step("После перезагрузки имя пришло с сервера", async () => {
      // Reload выбрасывает состояние страницы: имя должно прийти с сервера,
      // а не просто лежать в поле, куда мы его вписали.
      await page.reload();
      await expect(profileName(page)).toHaveValue(newName);
    });
  });

  test("часовой пояс выбираем из списка", async ({ page }) => {
    // По умолчанию Europe/Moscow — берём заведомо другой пояс,
    // иначе проверка прошла бы и без всякого выбора.
    const timezone = "Europe/Kaliningrad";

    await test.step("В списке пока пояс по умолчанию", async () => {
      await expect(profileTimezone(page)).toHaveValue("Europe/Moscow");
    });

    await test.step("Выбираем другой пояс и сохраняем", async () => {
      await profileTimezone(page).selectOption(timezone);
      await saveProfileAndWait(page);
    });

    await test.step("После перезагрузки выбран новый пояс", async () => {
      await page.reload();
      await expect(profileTimezone(page)).toHaveValue(timezone);
    });
  });

  test("telegram заполняем в пустом поле", async ({ page }) => {
    const telegram = `@hw8_valter_${Date.now()}`;

    await test.step("Поле после регистрации пустое", async () => {
      await expect(profileTelegram(page)).toHaveValue("");
    });

    await test.step("Вводим telegram и сохраняем", async () => {
      await profileTelegram(page).fill(telegram);
      await saveProfileAndWait(page);
    });

    await test.step("После перезагрузки telegram пришёл с сервера", async () => {
      await page.reload();
      await expect(profileTelegram(page)).toHaveValue(telegram);
    });
  });

  test("о себе заполняем многострочным текстом", async ({ page }) => {
    const bio = `QA-инженер, ДЗ Урока 8.\nПроверяю Act: ввод, выбор и нажатие. Прогон ${Date.now()}.`;

    await test.step("Вводим «О себе» и сохраняем", async () => {
      await profileBio(page).fill(bio);
      await saveProfileAndWait(page);
    });

    await test.step("После перезагрузки текст пришёл с сервера", async () => {
      await page.reload();
      await expect(profileBio(page)).toHaveValue(bio);
    });
  });

  test("навык добавляем с типом «могу помочь»", async ({ page }) => {
    const skill = `Playwright-hw8-${Date.now()}`;

    await test.step("Добавляем навык «могу помочь»", async () => {
      // Комбо из трёх действий: ввод, выбор в списке, нажатие.
      // У формы навыков своя кнопка «Добавить» — к верхнему «Сохранить» она не относится.
      await skillInput(page).fill(skill);
      await skillType(page).selectOption("can_help");
      await addSkill(page).click();
    });

    await test.step("Навык виден в списке «могу помочь»", async () => {
      await expect(canHelpSkills(page)).toContainText(skill);
    });
  });

  // ── ДЗ Урока 9: дописанные тесты ──

  test("навык добавляем с типом «хочу разобраться»", async ({ page }) => {
    const skill = `Playwright-hw9-${Date.now()}`;

    await test.step("Добавляем навык «хочу разобраться»", async () => {
      // Второй тип навыка: механика та же, что у «могу помочь»,
      // но навык попадает в другой блок списка.
      await skillInput(page).fill(skill);
      await skillType(page).selectOption("want_to_learn");
      await addSkill(page).click();
    });

    await test.step("Навык виден в списке «хочу разобраться»", async () => {
      await expect(wantToLearnSkills(page)).toContainText(skill);
    });
  });

  test("telegram меняем на другой", async ({ page }) => {
    const firstTelegram = `@hw9_valter_a${Date.now()}`;
    const secondTelegram = `@hw9_valter_b${Date.now()}`;

    await test.step("Сохраняем первый telegram", async () => {
      // Хитрый Arrange: сначала заполняем поле и сохраняем на сервер —
      // иначе менять было бы нечего.
      await profileTelegram(page).fill(firstTelegram);
      await saveProfileAndWait(page);
    });

    await test.step("В поле пока лежит первый telegram", async () => {
      await expect(profileTelegram(page)).toHaveValue(firstTelegram);
    });

    await test.step("Вводим второй telegram и сохраняем", async () => {
      await profileTelegram(page).fill(secondTelegram);
      await saveProfileAndWait(page);
    });

    await test.step("После перезагрузки пришёл второй telegram", async () => {
      // Reload выбрасывает состояние страницы: с сервера должно прийти
      // именно второе значение, а не первое.
      await page.reload();
      await expect(profileTelegram(page)).toHaveValue(secondTelegram);
    });
  });

  test("навык удаляем", async ({ page }) => {
    const skill = `Playwright-hw9-del-${Date.now()}`;

    await test.step("Добавляем навык «могу помочь»", async () => {
      await skillInput(page).fill(skill);
      await skillType(page).selectOption("can_help");
      await addSkill(page).click();
    });

    await test.step("Чип навыка виден", async () => {
      // Чип — кнопка с именем навыка внутри блока «могу помочь».
      await expect(skillChip(page, skill)).toBeVisible();
    });

    await test.step("Удаляем навык кликом по чипу", async () => {
      await skillChip(page, skill).click();
    });

    await test.step("Навыка больше нет", async () => {
      // Негативная проверка ДЗ-9: чип исчез, а вместе с последним навыком
      // исчезает и весь блок «могу помочь».
      await expect(skillChip(page, skill)).not.toBeVisible();
      await expect(canHelpSkills(page)).not.toBeVisible();
    });
  });
});
