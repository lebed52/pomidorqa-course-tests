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
    // runId и в имени: тесты фильтруют встречи по имени участника, и без него
    // фильтр цепляет карточку от прошлого прогона — почта уникальна, имя нет.
    name: `${role} Автотест ${runId}`,
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

export async function registerInNewContext(
  browser: Browser,
  user: TestUser,
): Promise<Page> {
  const context = await browser.newContext();
  try {
    const page = await context.newPage();
    await registerUser(page, user);
    return page;
  } catch (error) {
    // Если регистрация упала, page наружу не уйдёт и закрыть контекст в тесте
    // будет некому — закрываем здесь, иначе он висит до конца прогона.
    await context.close();
    throw error;
  }
}

// Регистрация нескольких участников подряд: если падает второй или третий,
// контексты уже зарегистрированных закрыть некому — тест до своего finally
// ещё не дошёл. Убираем их здесь.
export async function registerAllInNewContexts(
  browser: Browser,
  users: TestUser[],
): Promise<Page[]> {
  const pages: Page[] = [];
  try {
    for (const user of users) {
      pages.push(await registerInNewContext(browser, user));
    }
    return pages;
  } catch (error) {
    await Promise.all(pages.map((page) => page.context().close()));
    throw error;
  }
}

export function dateInDays(days: number): string {
  return new Date(Date.now() + days * 24 * 60 * 60 * 1000)
    .toISOString()
    .slice(0, 10);
}
