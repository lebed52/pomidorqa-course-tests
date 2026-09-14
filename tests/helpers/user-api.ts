import { expect, type Page, type BrowserContext } from "@playwright/test";

export const ROUTES = {
  home: "/pomidorqa",
  profile: "/pomidorqa/profile",
  accounts: "/api/pomidorqa/test/accounts",
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
  slotTime: string;
};

export type ApiUser = {
  user: TestUser;
  context: BrowserContext;
  page: Page;
};

export const contextTracker = {
  activeContexts: [] as BrowserContext[],

  track(context: BrowserContext) {
    if (!this.activeContexts.includes(context)) {
      this.activeContexts.push(context);
    }
  },

  async cleanup() {
    for (const context of this.activeContexts) {
      try {
        await deleteUserViaApi(context);
      } catch (error) {
        console.error("Не удалось удалить пользователя из БД:", error);
      } finally {
        await context.close().catch(() => {});
      }
    }
    this.activeContexts = [];
  }
};

export function uniqueTag(prefix: string, runId: number): string {
  return `${prefix}-${runId}-${Math.random().toString(36).slice(2, 8)}`;
}

export function makeUser(role: string, runId: number): TestUser {
  const unique = uniqueTag(role, runId);
  const baseName = `${role} Автотест ${unique}`;
  return {
    name: baseName,
    newName: `${baseName} Jr.`,
    email: `${unique}@example.com`,
    password: "testpass123",
    telegram: `@${role}_${unique}`,
    newTelegram: "@playwright_expert",
    bio: `Тест ${role} ${runId}`,
    newBio: "Автоматизатор. Пишу поддерживаемые e2e-тесты.",
    timezone: "Asia/Irkutsk",
    newTimezone: "Europe/Kaliningrad",
    slotTime: "12:00",
  };
}

export async function registerUserViaApi(page: Page, context: BrowserContext, user: TestUser) {
  contextTracker.track(context);

  await page.goto(ROUTES.home, { waitUntil: "commit" });

  const response = await context.request.post(ROUTES.accounts, {
    data: {
      name: user.name,
      email: user.email,
      password: user.password,
    },
  });

  expect(response.status()).toBe(201);
  await page.goto(ROUTES.profile, { waitUntil: "commit" });
}

export async function deleteUserViaApi(context: BrowserContext): Promise<void> {
  const response = await context.request.delete(ROUTES.accounts);
 
  if (response.status() !== 200) {
    throw new Error(
      `Удаление аккаунта не удалось: ${response.status()} ${await response.text()}`,
    );
  }
}
