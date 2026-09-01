import { Browser, BrowserContext, Page } from "@playwright/test";
import { BookingPage } from "../pages/booking-page";
import { ProfilePage } from "../pages/profile-page";
import { SlotsPage } from "../pages/slots-page";

export type AppContext = {
  context: BrowserContext;
  page: Page;
  bookingPage: BookingPage;
  profilePage: ProfilePage;
  slotsPage: SlotsPage;
};

export async function createApp(browser: Browser): Promise<AppContext> {
  const context = await browser.newContext();
  const page = await context.newPage();
  return {
    context,
    page,
    bookingPage: new BookingPage(page),
    profilePage: new ProfilePage(page),
    slotsPage: new SlotsPage(page),
  };
}

export async function createHostAndGuestsContexts(browser: Browser) {
  const [hostApp, guestApp, guest2App] = await Promise.all([
    createApp(browser),
    createApp(browser),
    createApp(browser),
  ]);
  return { hostApp, guestApp, guest2App };
}

export async function closeApps(apps: AppContext[]) {
  await Promise.all(
    apps.map(async (app) => {
      try {
        await app.context.close();
      } catch (err) {
        console.warn(`Контекст уже закрыт: ${(err as Error).message}`);
      }
    })
  );
}