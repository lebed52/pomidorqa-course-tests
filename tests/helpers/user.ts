import {
  type APIRequestContext,
  type BrowserContext,
} from "@playwright/test";

export const ROUTES = {
  profile: "/pomidorqa/profile",
  slots: "/pomidorqa/profile/slots",
  bookings: "/pomidorqa/bookings",
} as const;

export type TestUser = {
  name: string;
  email: string;
  password: string;
};

export type RegisteredParticipant = TestUser & {
  id: string;
};

const TEST_ACCOUNTS_ENDPOINT = "/api/pomidorqa/test/accounts";

export function makeUser(role: string, runId: number): TestUser {
  return {
    name: `${role} Автотест`,
    email: `${role}-${runId}@example.com`,
    password: "testpass123",
  };
}

export async function registerUserViaApi(
  request: APIRequestContext,
  user: TestUser,
): Promise<RegisteredParticipant> {
  const response = await request.post(TEST_ACCOUNTS_ENDPOINT, {
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
  const response = await request.delete(TEST_ACCOUNTS_ENDPOINT);

  if (response.status() !== 200) {
    throw new Error(
      `Удаление аккаунта не удалось: ${response.status()} ${await response.text()}`,
    );
  }
}

export async function cleanupUsersViaApi(
  contexts: BrowserContext[],
): Promise<void> {
  try {
    const results = await Promise.allSettled(
      contexts.map((context) => deleteUserViaApi(context.request)),
    );

    for (const result of results) {
      if (result.status === "rejected") {
        console.warn(
          "Не удалось удалить тестового участника:",
          result.reason,
        );
      }
    }
  } finally {
    await Promise.all(contexts.map((context) => context.close()));
  }
}