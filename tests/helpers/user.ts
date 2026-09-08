import { expect, type Page } from "@playwright/test";

// Урок 10: пользователь и регистрация вынесены из spec-файлов в общий хелпер.
// Раньше makeUser / registerUser копировались между profile-flow и booking-flow,
// теперь один источник правды для всех e2e-сценариев.

const REGISTER_URL = "/pomidorqa/auth/register";

export type TestUser = {
  name: string;
  email: string;
  password: string;
};

export function makeUser(role: string, runId: number): TestUser {
  return {
    name: `${role} Автотест`,
    email: `${role}-${runId}@example.com`,
    password: "testpass123",
  };
}

// Локаторы формы регистрации — локальные: наружу торчит только функция,
// отдельной страницы регистрации в ДЗ нет.
export async function registerUser(page: Page, user: TestUser) {
  await page.goto(REGISTER_URL);
  await page.getByLabel("Имя").fill(user.name);
  await page.getByLabel("Email").fill(user.email);
  await page.getByLabel("Пароль").fill(user.password);
  await page.getByRole("button", { name: "Зарегистрироваться" }).click();
  await expect(page).toHaveURL(/\/pomidorqa\/?$/);
}
