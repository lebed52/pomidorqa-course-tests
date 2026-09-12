import { expect, type Page } from "@playwright/test";

export const ROUTES = {
  register: "/pomidorqa/auth/register",
  profile: "/pomidorqa/profile",
  slots: "/pomidorqa/profile/slots",
  booking: "/pomidorqa/bookings",
};

export type TestUser = {
  name: string;
  email: string;
  password: string;
};

function randomSuffix(): string {
  return Math.random().toString(36).slice(2, 6);
}

export function makeUser(role: string, runId: number): TestUser {
  return {
    name: `${role}-${runId} Автотест`,
    email: `${role}-${runId}-${randomSuffix()}@example.com`,
    password: "testpass123",
  };
}

export function makeRandom(prefix: string) {
  return `${prefix}-${Date.now()}-${randomSuffix()}`;
}

export async function registerUser(page: Page, user: TestUser) {
  const registerNameInput = (page: Page) => page.getByLabel("Имя");
  const registerEmailInput = (page: Page) => page.getByLabel("Email");
  const registerPasswordInput = (page: Page) => page.getByLabel("Пароль");
  const registerSubmitButton = (page: Page) =>
    page.getByRole("button", { name: "Зарегистрироваться" });

  await page.goto(ROUTES.register);
  await registerNameInput(page).fill(user.name);
  await registerEmailInput(page).fill(user.email);
  await registerPasswordInput(page).fill(user.password);
  await registerSubmitButton(page).click();
  await expect(page).toHaveURL(/\/pomidorqa\/?$/);
}
