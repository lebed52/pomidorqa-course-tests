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
  // ИСПРАВЛЕНО: раньше уникальность строилась только на runId = Date.now().
  // При ретраях (--retries=2 в CI) или параллельных воркерах два вызова
  // могли попасть в одну и ту же миллисекунду -> коллизия email ->
  // тест падает на "email_taken", а не на реальной проверке сценария.
  // Добавляем случайный суффикс поверх timestamp.
  const unique = `${runId}-${Math.random().toString(36).slice(2, 8)}`;
  const baseName = `${role} Автотест`;
  return {
    name: baseName,
    newName: `${baseName} Jr.`,
    email: `${role}-${unique}@example.com`,
    password: "testpass123",
    telegram: `@${role}_${unique}`,
    newTelegram: `@${role}_updated_${unique}`,
    bio: `Тест ${role} ${unique}`,
    newBio: "Автоматизатор. Пишу поддерживаемые e2e-тесты.",
    timezone: "Europe/Moscow",
    newTimezone: "Asia/Yekaterinburg",
  };
}

export async function registerUser(page: Page, user: TestUser) {
  // ИСПРАВЛЕНО: waitUntil: "domcontentloaded" — не ждём полной загрузки
  // всех ресурсов страницы регистрации, только готовности DOM для fill().
  await page.goto(ROUTES.register, { waitUntil: "domcontentloaded" });
  await page.getByLabel("Имя").fill(user.name);
  await page.getByLabel("Email").fill(user.email);
  await page.getByLabel("Пароль").fill(user.password);
  await page.getByRole("button", { name: "Зарегистрироваться" }).click();
  await expect(page.getByRole("button", { name: "Регистрируем…" })).toBeHidden({
    timeout: 15_000,
  });
  await expect(page).toHaveURL(/\/pomidorqa\/?$/, { timeout: 15_000 });
}