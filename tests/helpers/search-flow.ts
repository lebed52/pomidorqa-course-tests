import { type Browser } from "@playwright/test";

import {
  makeSearchData,
  registerUserViaApi,
} from "./user";

import { BookingPage } from "../pages/booking-page";
import { ProfilePage } from "../pages/profile-page";

export async function prepareSearchFlow(browser: Browser) {
  const { skill, slotDate, host } = makeSearchData();

  const hostContext = await browser.newContext();
  const guestContext = await browser.newContext();

  await registerUserViaApi(hostContext.request, host);

  const hostPage = await hostContext.newPage();
  const guestPage = await guestContext.newPage();

  const hostProfile = new ProfilePage(hostPage);
  const hostBooking = new BookingPage(hostPage);
  const guestBooking = new BookingPage(guestPage);

  return {
    skill,
    slotDate,
    host,
    hostContext,
    guestContext,
    hostPage,
    guestPage,
    hostProfile,
    hostBooking,
    guestBooking,
  };
}