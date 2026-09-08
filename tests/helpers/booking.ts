import {
  type Browser,
  type BrowserContext,
  type Page,
} from "@playwright/test";
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

export type HostAndGuestContexts = {
  hostApp: AppContext;
  guestApp: AppContext;
};

export type HostAndGuestsContexts = {
  hostApp: AppContext;
  guestApp: AppContext;
  guest2App: AppContext;
};

export async function createApp(
  browser: Browser,
): Promise<AppContext> {
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

export async function createHostAndGuestContexts(
  browser: Browser,
): Promise<HostAndGuestContexts> {
  const [hostApp, guestApp] = await Promise.all([
    createApp(browser),
    createApp(browser),
  ]);

  return {
    hostApp,
    guestApp,
  };
}

export async function createHostAndGuestsContexts(
  browser: Browser,
): Promise<HostAndGuestsContexts> {
  const [hostApp, guestApp, guest2App] = await Promise.all([
    createApp(browser),
    createApp(browser),
    createApp(browser),
  ]);

  return {
    hostApp,
    guestApp,
    guest2App,
  };
}

export async function closeApps(
  apps: readonly AppContext[],
): Promise<void> {
  await Promise.all(
    apps.map(async (app) => {
      try {
        await app.context.close();
      } catch (error) {
        const reason =
          error instanceof Error ? error.message : String(error);

        console.warn(
          `Не удалось закрыть browser context: ${reason}`,
        );
      }
    }),
  );
}