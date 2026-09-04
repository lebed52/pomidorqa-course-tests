import { expect, type Browser, type Page } from "@playwright/test";

export const ROUTES = {
  register: "/pomidorqa/auth/register",
  profile: "/pomidorqa/profile",
  slots: "/pomidorqa/profile/slots",
  bookings: "/pomidorqa/bookings",
};

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

export async function registerUser(page: Page, user: TestUser) {
  await page.goto(ROUTES.register);
  await page.getByLabel("Имя").fill(user.name);
  await page.getByLabel("Email").fill(user.email);
  await page.getByLabel("Пароль").fill(user.password);
  await page.getByRole("button", { name: "Зарегистрироваться" }).click();
  // Стенд общий и живой: редирект после регистрации иногда не укладывается
  // в дефолтные 5 секунд expect — за день прогонов словил такой таймаут дважды.
  await expect(page).toHaveURL(/\/pomidorqa\/?$/, { timeout: 15_000 });
}

export async function registerInNewContext(browser: Browser, user: TestUser): Promise<Page> {
  const context = await browser.newContext();
  const page = await context.newPage();
  await registerUser(page, user);
  return page;
}

export function dateInDays(days: number): string {
  return new Date(Date.now() + days * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
}
