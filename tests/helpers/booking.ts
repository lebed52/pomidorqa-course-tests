import { type Browser } from "@playwright/test";
import { BookingPage } from "../pages/booking-page";

// Три независимых аккаунта = три независимых браузерных контекста
export async function createHostAndGuestsContexts(browser: Browser) {
  const hostContext = await browser.newContext();
  const guestContext = await browser.newContext();
  const guest2Context = await browser.newContext();

  const hostPage = await hostContext.newPage();
  const guestPage = await guestContext.newPage();
  const guest2Page = await guest2Context.newPage();

  const hostBooking = new BookingPage(hostPage);
  const guestBooking = new BookingPage(guestPage);
  const guest2Booking = new BookingPage(guest2Page);

  return {
    hostContext,
    guestContext,
    guest2Context,
    hostPage,
    guestPage,
    guest2Page,
    hostBooking,
    guestBooking,
    guest2Booking,
  };
}

export async function closeHostGuestContexts(
  contexts: Awaited<ReturnType<typeof createHostAndGuestsContexts>>
) {
  await contexts.hostContext.close();
  await contexts.guestContext.close();
  await contexts.guest2Context.close();
}