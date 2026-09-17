import { expect, type Page, type APIRequestContext, type BrowserContext } from "@playwright/test";

export const ROUTES = {
  register: "/pomidorqa/auth/register",
  profile: "/pomidorqa/profile",
  booking: "/pomidorqa/bookings",
  slots: "/pomidorqa/profile/slots",
  home: "/pomidorqa",
};

// Регистрация
/* const registerNameInput = (page: Page) => page.getByLabel("Имя");
const registerEmailInput = (page: Page) => page.getByLabel("Email");
const registerPasswordInput = (page: Page) => page.getByLabel("Пароль");
const registerSubmitButton = (page: Page) => page.getByRole("button", { name: "Зарегистрироваться" }); */

export type TestUser = {
  name: string;
  email: string;
  password: string;
};

export function makeUser(role: string, runId: number | string): TestUser {
  return {
    name: `${role}-${runId} Автотест`,
    email: `${role}-${runId}@example.com`,
    password: "testpass123",
  };
}

/* export async function registerUser(page: Page, user: TestUser) {
  await page.goto(ROUTES.register);
  await registerNameInput(page).fill(user.name);
  await registerEmailInput(page).fill(user.email);
  await registerPasswordInput(page).fill(user.password);
  await registerSubmitButton(page).click();
  await expect(page).toHaveURL(ROUTES.home);
}
  */

export type RegisteredParticipant = {
  id: string;
  name: string;
  email: string;
};

const testAccountsRoute = "/api/pomidorqa/test/accounts"; 

export async function registerUserViaApi(
  request: APIRequestContext,
  user: TestUser,
): Promise<RegisteredParticipant> {
  const response = await request.post(testAccountsRoute, { data: user });
  if (response.status() !== 201) {
    throw new Error(`Регистрация ${user.email} не удалась: ${response.status()} ${await response.text()}`);
  }
  return response.json();
}

export async function deleteUserViaApi(request: APIRequestContext): Promise<void> {
  const response = await request.delete(testAccountsRoute);
  if (response.status() !== 200) {
    throw new Error(`Удаление аккаунта не удалось: ${response.status()} ${await response.text()}`);
  }
}

// Ошибка одного удаления не мешает очистить остальные аккаунты и закрыть контексты.
export async function cleanupUsersViaApi(contexts: BrowserContext[]): Promise<void> {
  const results = await Promise.allSettled(contexts.map(async (context) => {
    try {
      await deleteUserViaApi(context.request);
    } finally {
      await context.close();
    }
  }));
  const errors = results.filter((result) => result.status === "rejected");
  if (errors.length) {
    throw new AggregateError(errors.map((result) => result.reason), "Не удалось очистить тестовые аккаунты");
  }
}
