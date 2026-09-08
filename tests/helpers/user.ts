import { test, expect, type Page } from "@playwright/test";

export const ROUTES = {
  catalog: "/pomidorqa",
  register: "/pomidorqa/auth/register",
  profile: "/pomidorqa/profile",
  slots: "/pomidorqa/profile/slots",
  bookings: "/pomidorqa/bookings",
};

export type TestUser = {
  name: string;
  email: string;
  password: string;
};

export function makeUser(role: string): TestUser {
  const unique = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

  return {
    name: `${role} Автотест ${unique}`,
    email: `${role}-${unique}@example.com`,
    password: "testpass123",
  };
}

export async function registerUser(
  page: Page,
  user: TestUser,
): Promise<void> {
  await test.step(`Хелпер: Регистрация пользователя ${user.name}`, async () => {
    let registrationPageResponse;

    try {
      registrationPageResponse = await page.goto(ROUTES.register);
    } catch (error) {
      const reason =
        error instanceof Error ? error.message : String(error);

      throw new Error(
        `Не удалось открыть страницу регистрации для ${user.email}. ` +
          `URL: ${page.url()}. Причина: ${reason}`,
      );
    }

    if (
      registrationPageResponse &&
      registrationPageResponse.status() >= 400
    ) {
      throw new Error(
        `Страница регистрации для ${user.email} вернула ` +
          `HTTP ${registrationPageResponse.status()} ` +
          `${registrationPageResponse.statusText()}`,
      );
    }

    await page.getByLabel("Имя").fill(user.name);
    await page.getByLabel("Email").fill(user.email);
    await page.getByLabel("Пароль").fill(user.password);

    await page
      .getByRole("button", { name: "Зарегистрироваться" })
      .click();

    await expect(
      page,
      `После регистрации ${user.email} ожидается переход на главную PomidorQA`,
    ).toHaveURL(/\/pomidorqa\/?$/, {
      timeout: 15_000,
    });
  });
}