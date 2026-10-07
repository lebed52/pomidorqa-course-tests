import { test, expect, type Page } from "@playwright/test";

type TestUser = {
  name: string;
  email: string;
  password: string;
};

// URL-адреса приложения,
// Для простоты изменения вынес их вверх
const ROUTES = {
  register: "/pomidorqa/auth/register",
  profile: "/pomidorqa/profile",
  slots: "/pomidorqa/profile/slots",
};

// Локаторы элементов
const LOCATORS = {
  register: {
    name: (page: Page) => page.locator("#pomidorqa-register-name"),
    email: (page: Page) => page.getByLabel("Email"),
    password: (page: Page) => page.getByLabel("Пароль"),
    submit: (page: Page) =>
      page.getByRole("button", { name: "Зарегистрироваться" }),
  },

  profile: {
    name: (page: Page) => page.getByLabel("Имя"),
    save: (page: Page) => page.getByRole("button", { name: "Сохранить" }),

    skill: {
      input: (page: Page) => page.getByLabel("Навык"),
      type: (page: Page) => page.getByLabel("Тип"),
      add: (page: Page) => page.getByRole("button", { name: "Добавить" }),
      canHelp: (page: Page) => page.getByTestId("can-help-skills"),
    },
  },

  slots: {
    date: (page: Page) => page.getByLabel("Дата"),
    time: (page: Page) => page.getByLabel("Время начала"),
    add: (page: Page) => page.getByRole("button", { name: "Добавить слот" }),
    free: (page: Page) => page.locator('[data-slot-status="free"]').first(),
  },
};


function makeUser(role: string, runId: number): TestUser {
  return {
    name: `${role} Автотест`,
    email: `${role}-${runId}@example.com`,
    password: "testpass123",
  };
}

// Функция возвращает дату через указанное количество дней
function getDateInDays(days: number): string {
  return new Date(Date.now() + days * 24 * 60 * 60 * 1000)
    .toISOString()
    .slice(0, 10);
}


async function registerUser(page: Page, user: TestUser) {
  await page.goto(ROUTES.register);
  await LOCATORS.register.name(page).fill(user.name);
  await LOCATORS.register.email(page).fill(user.email);
  await LOCATORS.register.password(page).fill(user.password);
  await LOCATORS.register.submit(page).click();
  await expect(page).toHaveURL(/\/pomidorqa\/?$/);
}


test.describe("Тесты на профиле после регистрации", () => {
  let user: TestUser;

  // Создаём пользователя, регистрируем его и открываем профиль.
  test.beforeEach(async ({ page }) => {
    user = makeUser("student", Date.now());
    await registerUser(page, user);
    await page.goto(ROUTES.profile);
  });

  test("Смена имени в профиле", async ({ page }) => {
    const newName = `${user.name} Новое имя`;
    await test.step("Меняем имя и сохраняем профиль", async () => {
      await LOCATORS.profile.name(page).fill(newName);
      await LOCATORS.profile.save(page).click();
      await expect(LOCATORS.profile.name(page)).toHaveValue(newName);
    });
  });

  test("Добавление навыка могу помочь", async ({ page }) => {
    await test.step("Добавляем навык Playwright", async () => {
      await LOCATORS.profile.skill.input(page).fill("Playwright");
      await LOCATORS.profile.skill.type(page).selectOption("can_help");
      await LOCATORS.profile.skill.add(page).click();
      await expect(LOCATORS.profile.skill.canHelp(page)).toContainText(
        "Playwright",
      );
    });
  });

  test("Добавление свободного слота", async ({ page }) => {
    await test.step("Добавляем слот на завтра в 12:00", async () => {
      await page.goto(ROUTES.slots);
      await LOCATORS.slots.date(page).fill(getDateInDays(1));
      await LOCATORS.slots.time(page).fill("12:00");
      await LOCATORS.slots.add(page).click();
      await expect(LOCATORS.slots.free(page)).toBeVisible();
    });
  });
});
