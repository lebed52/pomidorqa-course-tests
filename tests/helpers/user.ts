import { type Browser, type BrowserContext, type Page } from "@playwright/test";

export const ROUTES = {
  home: "/pomidorqa",
  profile: "/pomidorqa/profile",
  slots: "/pomidorqa/profile/slots",
  bookings: "/pomidorqa/bookings",
  accounts: "/api/pomidorqa/test/accounts",
};

export type TestUser = {
  name: string;
  email: string;
  password: string;
};

// Контекст держим рядом с пользователем: DELETE аккаунта не принимает id,
// он удаляет владельца пришедшей куки. Значит убрать за собой можно только
// из того же контекста, в котором пользователь создавался.
export type ApiUser = {
  user: TestUser;
  context: BrowserContext;
  page: Page;
};

export function makeUser(role: string, runId: number): TestUser {
  // Хвост случайный, а не только runId: два воркера, стартовавшие в одну
  // миллисекунду, дают одинаковую почту, а стенд отвечает на дубль 409 —
  // тест падает ещё до первого шага. Имя тоже уникальное: сценарии
  // фильтруют встречи по имени участника.
  const unique = `${role}-${runId}-${Math.random().toString(36).slice(2, 8)}`;
  return {
    name: `${role} Автотест ${unique}`,
    email: `${unique}@example.com`,
    password: "testpass123",
  };
}

// Регистрация через API, а не через форму: саму форму проверяет отдельный
// тест, всем остальным зарегистрированный пользователь нужен как предусловие.
// POST возвращает куку сессии, а context.request живёт в том же хранилище
// кук, что и страницы контекста, — поэтому браузер оказывается авторизован
// без отдельного входа.
export async function createUserInNewContext(
  browser: Browser,
  user: TestUser,
  startUrl: string = ROUTES.home
): Promise<ApiUser> {
  const context = await browser.newContext();
  try {
    const response = await context.request.post(ROUTES.accounts, { data: user });
    if (response.status() !== 201) {
      throw new Error(
        `Создание ${user.email} не удалось: ${response.status()} ${await response.text()}`
      );
    }
    const page = await context.newPage();
    // Форма регистрации оставляла пользователя на главной, API не открывает
    // ничего — без явного перехода страница висит на about:blank.
    await page.goto(startUrl);
    return { user, context, page };
  } catch (error) {
    // Контекст наружу не уйдёт, и закрыть его в afterEach будет некому:
    // в список созданных он попасть не успел.
    await context.close();
    throw error;
  }
}

export async function deleteUser(apiUser: ApiUser): Promise<void> {
  const response = await apiUser.context.request.delete(ROUTES.accounts);
  if (response.status() !== 200) {
    throw new Error(
      `Удаление ${apiUser.user.email} не удалось: ${response.status()} ${await response.text()}`
    );
  }
}

// Список созданных за тест пользователей: afterEach не знает, сколько их
// завёл сценарий, поэтому тест складывает их сюда, а хук разбирает.
export class UserPool {
  private created: ApiUser[] = [];

  async add(
    browser: Browser,
    role: string,
    runId: number,
    startUrl?: string
  ): Promise<ApiUser> {
    const apiUser = await createUserInNewContext(
      browser,
      makeUser(role, runId),
      startUrl
    );
    this.created.push(apiUser);
    return apiUser;
  }

  // splice, а не обход живого списка: он должен опустеть даже если удаление
  // упало, иначе следующий тест пойдёт удалять чужих покойников и получит 401.
  async cleanup(): Promise<void> {
    const batch = this.created.splice(0);
    const results = await Promise.allSettled(
      batch.map(async (apiUser) => {
        try {
          await deleteUser(apiUser);
        } finally {
          await apiUser.context.close();
        }
      })
    );
    const failed = results.filter((result) => result.status === "rejected");
    if (failed.length > 0) {
      throw new Error(
        `Не убрали за собой: ${failed.map((result) => result.reason).join("; ")}`
      );
    }
  }
}

export function dateInDays(days: number): string {
  return new Date(Date.now() + days * 24 * 60 * 60 * 1000)
    .toISOString()
    .slice(0, 10);
}
