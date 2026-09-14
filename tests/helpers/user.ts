import { APIRequestContext, Page, expect } from '@playwright/test';

export type TestUser = {
  name: string;
  email: string;
  password: string;
};

export const ROUTES = {
  register: '/pomidorqa/auth/register',
  testAccounts: '/api/pomidorqa/test/accounts',
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
    password: 'testpass123',
  };
}

export async function registerUser(
  request: APIRequestContext,
  user: TestUser,
): Promise<RegisteredParticipant> {
  const response = await request.post(ROUTES.testAccounts, { data: user, timeout: 30_000 });

  if (response.status() !== 201) {
    throw new Error(
      `Регистрация ${user.email} не удалось: ${response.status()} ${await response.text()}`,
    );
  }
  return response.json();
}

export async function deleteUserViaApi(request: APIRequestContext): Promise<void> {
  const response = await request.delete(ROUTES.testAccounts);

  if (response.status() !== 200) {
    throw new Error(`Удаление аккаунта не удалось: ${response.status()} ${await response.text()}`);
  }
}

export async function cleanupUsersViaApi(
  contexts: Array<{ request: APIRequestContext }>,
): Promise<void> {
  for (const context of contexts) {
    try {
      await deleteUserViaApi(context.request);
    } catch {}
  }
}

export async function reload(page: Page) {
  await page.reload();
}

export function addDate() {
  const tomorrow = new Date(Date.now() + 24 * 60 * 60 * 1000);
  return tomorrow.toISOString().slice(0, 10);
}
