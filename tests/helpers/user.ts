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

// Хвост случайный, а не только runId: два воркера, стартовавшие в одну
// миллисекунду, дают одинаковое значение. Для почты это 409 от стенда, для
// навыка — чужой хост в выдаче каталога, что хуже: тест упадёт по ложной
// причине или пройдёт по неправильной.
export function uniqueTag(prefix: string, runId: number): string {
  return `${prefix}-${runId}-${Math.random().toString(36).slice(2, 8)}`;
}

export function makeUser(role: string, runId: number): TestUser {
  // Имя тоже уникальное: сценарии фильтруют встречи по имени участника.
  const unique = uniqueTag(role, runId);
  return {
    name: `${role} Автотест ${unique}`,
    email: `${unique}@example.com`,
    password: "testpass123",
  };
}

// Кодекс 11: если тест не проверяет форму регистрации, участник заводится
// через API. POST возвращает куку сессии, а context.request живёт в том же
// хранилище кук, что и страницы контекста, — браузер оказывается авторизован
// без отдельного входа.
export async function registerUserViaApi(
  context: BrowserContext,
  user: TestUser,
): Promise<TestUser> {
  const response = await context.request.post(ROUTES.accounts, { data: user });
  if (response.status() !== 201) {
    throw new Error(
      `Создание ${user.email} не удалось: ${response.status()} ${await response.text()}`,
    );
  }
  return user;
}

// Кодекс 12: удаление каскадное — вместе с аккаунтом уезжают навыки, слоты
// и брони. DELETE не принимает id, он сносит владельца пришедшей куки,
// поэтому звать его можно только из контекста, где участник создавался.
export async function deleteCurrentTestUser(context: BrowserContext): Promise<void> {
  const response = await context.request.delete(ROUTES.accounts);
  if (response.status() !== 200) {
    throw new Error(`Удаление аккаунта не удалось: ${response.status()} ${await response.text()}`);
  }
}

type PooledUser = {
  context: BrowserContext;
  accountCreated: boolean;
};

// Список контекстов, созданных за тест: afterEach не знает, сколько их завёл
// сценарий, поэтому тест складывает их сюда, а хук разбирает.
export class UserPool {
  private created: PooledUser[] = [];

  async add(browser: Browser, role: string, runId: number, startUrl?: string): Promise<ApiUser> {
    const context = await browser.newContext();
    // Кодекс 12: контекст попадает в список до первого действия, которое
    // может упасть. Иначе упавшая регистрация оставит и контекст открытым,
    // и аккаунт на стенде — снести его будет уже нечем, кука пропадёт.
    const pooled: PooledUser = { context, accountCreated: false };
    this.created.push(pooled);

    const user = await registerUserViaApi(context, makeUser(role, runId));
    pooled.accountCreated = true;

    const page = await context.newPage();
    // Форма регистрации оставляла участника на главной, API не открывает
    // ничего — без явного перехода страница висит на about:blank.
    await page.goto(startUrl ?? ROUTES.home);
    return { user, context, page };
  }

  // splice, а не обход живого списка: он должен опустеть даже если удаление
  // упало, иначе следующий тест пойдёт удалять чужих покойников и получит 401.
  async cleanup(): Promise<void> {
    const batch = this.created.splice(0);
    const results = await Promise.allSettled(
      batch.map(async (pooled) => {
        try {
          // Если регистрация не дошла до 201, удалять нечего, а DELETE
          // ответит 401 и подменит настоящую причину падения теста.
          if (pooled.accountCreated) {
            await deleteCurrentTestUser(pooled.context);
          }
        } finally {
          await pooled.context.close();
        }
      }),
    );
    const failed = results.filter((result) => result.status === "rejected");
    if (failed.length > 0) {
      throw new Error(`Не убрали за собой: ${failed.map((result) => result.reason).join("; ")}`);
    }
  }
}

export function dateInDays(days: number): string {
  return new Date(Date.now() + days * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
}
