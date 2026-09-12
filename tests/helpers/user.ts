import { Page, expect } from "@playwright/test";

export type TestUser = {
  name: string;
  email: string;
  password: string;
};

export function makeUser(role: string, runId: number): TestUser {
  return {
    name: `${role}-${runId} Автотест`,
    email: `${role}-${runId}@example.com`,
    password: "testpass123",
  };
}

export async function registerUser(page: Page, user: TestUser) {
  await page.goto("/pomidorqa/auth/register");
  await page.getByLabel("Имя").fill(user.name);
  await page.getByLabel("Email").fill(user.email);
  await page.getByLabel("Пароль").fill(user.password);
  await page.getByRole("button", { name: "Зарегистрироваться" }).click();
  await expect(page).toHaveURL(/\/pomidorqa\/?$/);
}

export function getTomorrowDate(): string {
  const tomorrow = new Date();

  tomorrow.setDate(tomorrow.getDate() + 1);

  const year = tomorrow.getFullYear();
  const month = String(tomorrow.getMonth() + 1).padStart(2, "0");
  const day = String(tomorrow.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

export function makeSearchData() {
  const runId = Date.now();

  return {
    skill: `HW13-search-${runId}`,
    slotDate: getTomorrowDate(),
    host: makeUser("host", runId),
  };
}

export function makeLoginErrorData() {
  const runId = Date.now();

  return {
    user: makeUser("login-check", runId),
    wrongPassword: "wrong-password",
    unknownEmail: `unknown-${runId}@example.com`,
    unknownPassword: "any-password",
  };
}

export function makeBookingFlowData() {
  const runId = Date.now();

  return {
    skillTag: `Playwright-demo-${runId}`,
    host: makeUser("host", runId),
    guest: makeUser("guest", runId),
    guest2: makeUser("guest2", runId),
  };
}