import { expect, type Page } from "@playwright/test";

  export const timezones = {
  EKATERINBURG: "Asia/Yekaterinburg",
  MOSCOW: "Europe/Moscow",
  LONDON: "Europe/London",
} as const;

  
// Регистрация
const registerNameInput = (page: Page) => page.getByLabel("Имя");
const registerEmailInput = (page: Page) => page.getByLabel("Email");
const registerPasswordInput = (page: Page) => page.getByLabel("Пароль");
const registerSubmitButton = (page: Page) => page.getByRole("button", { name: "Зарегистрироваться" });



// Создаёт объект пользователя для тестов
export type TestUser = {
  name: string;
  email: string;
  password: string;
};

// Возвращает объект пользователя для тестов
export function makeUser(role: string, runId: number): TestUser {
  return {
    name: `${role} Автотест`,
    email: `${role}-${runId}@example.com`,
    password: "testpass123",
  };
}

// Регистрация пользователя через UI
export async function registerUser(page: Page, user: TestUser) {
  await page.goto("/pomidorqa/auth/register");
  await registerNameInput(page).fill(user.name);
  await registerEmailInput(page).fill(user.email);
  await registerPasswordInput(page).fill(user.password);
  await registerSubmitButton(page).click();
  await expect(page).toHaveURL(/\/pomidorqa\/?$/);
}
  
