import { expect, type Page } from "@playwright/test";

export const ROUTES = {
  register: "/pomidorqa/auth/register",
  profile: "/pomidorqa/profile",
};

export type TestUser = {
  name: string;
  newName: string;
  email: string;
  password: string;
  telegram: string;
  newTelegram: string;
  bio: string;
  newBio: string;
  timezone: string;
  newTimezone: string;
};

export function makeUser(role: string, runId: number): TestUser {
  const baseName = `${role} Автотест`;

  return {
    name: baseName,
    newName: `${baseName} Jr.`,
    email: `${role}-${runId}@example.com`,
    password: "testpass123",
    telegram: `@${role}_${runId}`,
    newTelegram: `@${role}_updated_${runId}`,
    bio: `Тест ${role} ${runId}`,
    newBio: "Автоматизатор. Пишу поддерживаемые e2e-тесты.",
    timezone: "Europe/Moscow",
    newTimezone: "Asia/Yekaterinburg",
  };
}

export async function registerUser(page: Page, user: TestUser) {
  await page.goto(ROUTES.register);
  await page.getByLabel("Имя").fill(user.name);
  await page.getByLabel("Email").fill(user.email);
  await page.getByLabel("Пароль").fill(user.password);
  await page.getByRole("button", { name: "Зарегистрироваться" }).click();
  await expect(page).toHaveURL(/\/pomidorqa\/?$/);
}