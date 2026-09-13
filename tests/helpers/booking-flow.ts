import { type Browser, type BrowserContext } from "@playwright/test";

import {
  getTomorrowDate,
  makeBookingFlowData,
  registerUserViaApi,
} from "./user";

import { BookingPage } from "../pages/booking-page";
import { ProfilePage } from "../pages/profile-page";

export async function prepareBookingFlow(
  browser: Browser,
  contexts: BrowserContext[],
) {
  const { skillTag, host, guest, guest2 } = makeBookingFlowData();

  const hostContext = await browser.newContext();
  contexts.push(hostContext);

  const guestContext = await browser.newContext();
  contexts.push(guestContext);

  const guest2Context = await browser.newContext();
  contexts.push(guest2Context);

  await registerUserViaApi(hostContext.request, host);
  await registerUserViaApi(guestContext.request, guest);
  await registerUserViaApi(guest2Context.request, guest2);

  const hostPage = await hostContext.newPage();
  const guestPage = await guestContext.newPage();
  const guest2Page = await guest2Context.newPage();

  await hostPage.goto("/pomidorqa");
  await guestPage.goto("/pomidorqa");
  await guest2Page.goto("/pomidorqa");

  const hostProfile = new ProfilePage(hostPage);

  const hostBooking = new BookingPage(hostPage);
  const guestBooking = new BookingPage(guestPage);
  const guest2Booking = new BookingPage(guest2Page);

  const slotDate = getTomorrowDate();

  return {
    skillTag,
    host,
    guest,
    guest2,
    hostContext,
    guestContext,
    guest2Context,
    hostPage,
    guestPage,
    guest2Page,
    hostProfile,
    guestBooking,
    guest2Booking,
    hostBooking,
    slotDate,
  };
}