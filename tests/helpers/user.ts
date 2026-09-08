import { expect, Page } from "@playwright/test";
import { RegisterPage } from "../pages/register-page";

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
  const registerPage = new RegisterPage(page);
  await registerPage.goto();

  await registerPage.fillName(user.name);
  await registerPage.fillEmail(user.email);
  await registerPage.fillPassword(user.password);
  await registerPage.submit();

  await expect(page).toHaveURL(/\/pomidorqa\/?$/);
}