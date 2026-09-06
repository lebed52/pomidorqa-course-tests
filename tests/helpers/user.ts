import { expect, type Page } from '@playwright/test';

export type TestUser = {
  name: string;
  email: string;

  password: string;
};

export const ROUTES = {
  register: '/pomidorqa/auth/register',
  login: '/pomidorqa/auth/login',
};

export function makeUser(role: string, runId: number): TestUser {
  const salt = Math.random().toString(36).slice(2, 6);
  return {
    name: `${role} Автотест`,
    email: `${role}-${runId}-${salt}@example.com`,
    password: 'testpass123',
  };
}

export function makeUnique(prefix: string) {
  return `${prefix}-${Date.now()}`;
}

export async function registerUser(page: Page, user: TestUser) {
  await expect(async () => {
    await page.goto(ROUTES.register);
    await page.getByLabel('Имя').fill(user.name);
    await page.getByLabel('Email').fill(user.email);
    await page.getByLabel('Пароль').fill(user.password);
    await page.getByRole('button', { name: 'Зарегистрироваться' }).click();

    const emailTaken = await page
      .getByText('Этот email уже зарегистрирован')
      .isVisible()
      .catch(() => false);
    if (emailTaken) {
      await loginUser(page, user.email, user.password);
    }
    await expect(page).toHaveURL(/\/pomidorqa\/?$/, { timeout: 8_000 });
  }).toPass({ timeout: 25_000 });
}

export async function loginUser(page: Page, email: string, password: string) {
  await page.goto(ROUTES.login);
  await page.getByLabel('Email').fill(email);
  await page.getByLabel('Пароль').fill(password);
  await page.getByRole('button', { name: 'Войти' }).click();
}
