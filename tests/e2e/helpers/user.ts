import { test, expect, type Page } from "@playwright/test";

// Функция, которая создает объект пользователя с уникальными данными
export function makeUser(role: string, runId: number) {
  return {
    name: `${role} Автотест`,
    email: `${role}-${runId}@example.com`,
    password: "testpass123",
  };
}
// Функция для регистрации пользователя (переиспользуется во всех тестах)
export async function registerUser(page: Page, user: { name: string; email: string; password: string }) {
  await page.goto("/pomidorqa/auth/register");
  await page.getByRole("textbox", { name: "Имя" }).fill(user.name);
  await page.getByRole("textbox", { name: "Email" }).fill(user.email);
  await page.getByLabel("Пароль").fill(user.password);
  await page.getByRole("button", { name: "Зарегистрироваться" }).click();
  await expect(page).toHaveURL(/\/pomidorqa\/?$/);
}