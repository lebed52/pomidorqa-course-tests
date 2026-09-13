import {
  expect,
  type APIRequestContext,
  type BrowserContext,
  type Page,
} from "@playwright/test";

const registerNameInput = (page: Page) => page.getByLabel("Имя");
const registerEmailInput = (page: Page) => page.getByLabel("Email");
const registerPasswordInput = (page: Page) => page.getByLabel("Пароль");
const registerSubmitButton = (page: Page) =>
  page.getByRole("button", { name: "Зарегистрироваться" });

export const ROUTES = {
  register: "/pomidorqa/auth/register",
  profile: "/pomidorqa/profile",
};

export type TestUser = {
  name: string;
  email: string;
  password: string;
};

export type RegisteredParticipant = {
  id: string;
  name: string;
  email: string;
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
  await registerNameInput(page).fill(user.name);
  await registerEmailInput(page).fill(user.email);
  await registerPasswordInput(page).fill(user.password);
  await registerSubmitButton(page).click();
  await expect(page).toHaveURL(/\/pomidorqa\/?$/);
}

export async function registerUserViaApi(
  request: APIRequestContext,
  user: TestUser,
): Promise<RegisteredParticipant> {
  const response = await request.post("/api/pomidorqa/test/accounts", {
    data: user,
  });

  if (response.status() !== 201) {
    throw new Error(
      `Регистрация ${user.email} не удалась: ${response.status()} ${await response.text()}`,
    );
  }

  return response.json();
}

export async function deleteUserViaApi(
  request: APIRequestContext,
): Promise<void> {
  const response = await request.delete("/api/pomidorqa/test/accounts");

  if (response.status() !== 200) {
    throw new Error(
      `Удаление аккаунта не удалось: ${response.status()} ${await response.text()}`,
    );
  }
}

export async function cleanupUsersViaApi(contexts: BrowserContext[]) {
  for (const context of contexts) {
    await deleteUserViaApi(context.request);
  }
}
