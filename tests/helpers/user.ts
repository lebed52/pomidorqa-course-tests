import { test, expect, type Page } from "@playwright/test";

export const ROUTES = {
  catalog: "/pomidorqa",
  register: "/pomidorqa/auth/register",
  profile: "/pomidorqa/profile",
  slots: "/pomidorqa/profile/slots",
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
  await test.step(`Хелпер: регистрация пользователя ${user.name}`, async () => {
    const response = await page.goto(ROUTES.register);

    if (response && response.status() >= 400) {
      throw new Error(
        `Страница регистрации вернула HTTP ${response.status()} ${response.statusText()}`,
      );
    }

    await page.getByLabel("Имя").fill(user.name);
    await page.getByLabel("Email").fill(user.email);
    await page.getByLabel("Пароль").fill(user.password);
    await page
      .getByRole("button", { name: "Зарегистрироваться" })
      .click();

    await expect(page).toHaveURL(/\/pomidorqa\/?$/, { timeout: 15_000 });
  });
}