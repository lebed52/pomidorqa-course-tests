import { Browser, BrowserContext, Page } from "@playwright/test";
import { BookingPage } from "../pages/booking-page";
import { ProfilePage } from "../pages/profile-page";

export type AppContext = {
  context: BrowserContext;
  page: Page;
  bookingPage: BookingPage;
  profilePage: ProfilePage;
};

/**
 * Создает изолированный браузерный контекст и привязывает к нему Page Objects
 */
export async function createApp(browser: Browser): Promise<AppContext> {
  const context = await browser.newContext();
  const page = await context.newPage();
  return {
    context,
    page,
    bookingPage: new BookingPage(page),
    profilePage: new ProfilePage(page),
  };
}

/**
 * Инициализирует сразу три независимых профиля (Хост и два Гостя)
 */
export async function createHostAndGuestsContexts(browser: Browser) {
  const [hostApp, guestApp, guest2App] = await Promise.all([
    createApp(browser),
    createApp(browser),
    createApp(browser),
  ]);
  return { hostApp, guestApp, guest2App };
}

/**
 * Гарантированное закрытие всех контекстов для очистки памяти (finally)
 */
export async function closeApps(apps: AppContext[]) {
  await Promise.all(apps.map((app) => app.context.close()));
}