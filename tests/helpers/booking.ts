import { type Browser, type BrowserContext, type Page } from "@playwright/test";
import { BookingPage } from "../pages/booking-page";

type Actor = {
  context: BrowserContext;
  page: Page;
  booking: BookingPage;
};

async function createActor(browser: Browser): Promise<Actor> {
  const context = await browser.newContext();
  const page = await context.newPage();
  return { context, page, booking: new BookingPage(page) };
}

// Три независимых аккаунта = три независимых браузерных контекста
export async function createHostAndGuestsContexts(browser: Browser) {
  const host = await createActor(browser);
  const guest = await createActor(browser);
  const guest2 = await createActor(browser);

  return {
    hostContext: host.context,
    guestContext: guest.context,
    guest2Context: guest2.context,
    hostPage: host.page,
    guestPage: guest.page,
    guest2Page: guest2.page,
    hostBooking: host.booking,
    guestBooking: guest.booking,
    guest2Booking: guest2.booking,
  };
}

export async function closeHostGuestContexts(
  contexts: Awaited<ReturnType<typeof createHostAndGuestsContexts>>
) {
  await contexts.hostContext.close();
  await contexts.guestContext.close();
  await contexts.guest2Context.close();
}

export async function createHostAndGuestContexts(browser: Browser) {
  const host = await createActor(browser);
  const guest = await createActor(browser);

  return {
    hostContext: host.context,
    guestContext: guest.context,
    hostPage: host.page,
    guestPage: guest.page,
    hostBooking: host.booking,
    guestBooking: guest.booking,
  };
}

export async function closeHostGuestPairContexts(
  contexts: Awaited<ReturnType<typeof createHostAndGuestContexts>>
) {
  await contexts.hostContext.close();
  await contexts.guestContext.close();
}