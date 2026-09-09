import {type Browser,type BrowserContext,type Page,} from "@playwright/test";
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

export async function closeApps(apps: readonly AppContext[]): Promise<void> {
  await Promise.all(
    apps.map(async (app) => {
      try {
        await app.context.close();
      } catch (error) {
        const reason = error instanceof Error ? error.message : String(error);
        console.warn(`Не удалось закрыть browser context: ${reason}`);
      }
    }),
  );
}