import type { Browser, BrowserContext, Page } from '@playwright/test';
import { makeUser, type TestUser } from './user';
import { BookingPage } from '../pages/booking';
import { CatalogPage } from '../pages/catalog';
import { ProfilePage } from '../pages/profile';
import { SlotsPage } from '../pages/slots';

export type BookingMeet = {
  host: TestUser;
  guest: TestUser;
  skillTag: string;
  hostContext: BrowserContext;
  guestContext: BrowserContext;
  hostPage: Page;
  guestPage: Page;
  hostProfile: ProfilePage;
  hostSlots: SlotsPage;
  hostBooking: BookingPage;
  guestCatalog: CatalogPage;
  guestBooking: BookingPage;
};

/** Создаёт актёров, контексты и страницы для сценария брони — данные без действий. */
export async function bookingMeet(browser: Browser): Promise<BookingMeet> {
  const runId = Date.now();
  const skillTag = `Playwright-demo-${runId}`;
  const host = makeUser('host', runId);
  const guest = makeUser('guest', runId);

  const hostContext = await browser.newContext();
  const guestContext = await browser.newContext();
  const hostPage = await hostContext.newPage();
  const guestPage = await guestContext.newPage();

  return {
    host,
    guest,
    skillTag,
    hostContext,
    guestContext,
    hostPage,
    guestPage,
    hostProfile: new ProfilePage(hostPage),
    hostSlots: new SlotsPage(hostPage),
    hostBooking: new BookingPage(hostPage),
    guestCatalog: new CatalogPage(guestPage),
    guestBooking: new BookingPage(guestPage),
  };
}
