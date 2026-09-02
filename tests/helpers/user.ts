import { expect, type Page } from '@playwright/test';

const registerNameInput = (page: Page) => page.getByLabel('Имя');
const registerEmailInput = (page: Page) => page.getByLabel('Email');
const registerPasswordInput = (page: Page) => page.getByLabel('Пароль');
const registerSubmitButton = (page: Page) =>
  page.getByRole('button', { name: 'Зарегистрироваться' });

export type TestUser = {
  name: string;
  email: string;
  password: string;
};

export const ROUTES = {
  register: '/pomidorqa/auth/register',
  profile: '/pomidorqa/profile',
};

export function makeUser(role: string, runId: number) {
  return {
    name: `${role} Автотест`,
    email: `${role}-${runId}@example.com`,
    password: 'testpass123',
  };
}

export async function registerUser(page: Page, user: TestUser) {
  await page.goto(ROUTES.register, { waitUntil: 'domcontentloaded' });
  await registerNameInput(page).fill(user.name);
  await registerEmailInput(page).fill(user.email);
  await registerPasswordInput(page).fill(user.password);
  await registerSubmitButton(page).click();
  await expect(page).toHaveURL(/\/pomidorqa\/?$/);
}
