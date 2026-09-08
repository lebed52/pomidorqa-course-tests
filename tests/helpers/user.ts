import { Page, expect } from '@playwright/test';

export type TestUser = {
  name: string;
  email: string;
  password: string;
};

export function makeUser(role: string, runId: number): TestUser {
  return {
    name: `${role} Автотест`,
    email: `${role}-${runId}@example.com`,
    password: 'testpass123',
  };
}

export async function registerUser(page: Page, user: TestUser) {
  await page.goto('/pomidorqa/auth/register');
  await page.getByLabel('Имя').fill(user.name);
  await page.getByLabel('Email').fill(user.email);
  await page.getByLabel('Пароль').fill(user.password);
  await page.getByRole('button', { name: 'Зарегистрироваться' }).click();
  await expect(page).toHaveURL(/\/pomidorqa\/?$/);
}
