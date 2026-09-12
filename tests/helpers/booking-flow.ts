import { type Browser } from "@playwright/test";

import { getTomorrowDate, makeBookingFlowData } from "./user";
import { BookingPage } from "../pages/booking-page";
import { CatalogPage } from "../pages/catalog-page";
import { ProfilePage } from "../pages/profile-page";

export async function prepareBookingFlow(browser: Browser) {
    const { skillTag, host, guest, guest2 } = makeBookingFlowData();
  
    const hostContext = await browser.newContext();
    const guestContext = await browser.newContext();
    const guest2Context = await browser.newContext();
  
    const hostPage = await hostContext.newPage();
    const guestPage = await guestContext.newPage();
    const guest2Page = await guest2Context.newPage();
  
    const hostProfile = new ProfilePage(hostPage);
    const guestCatalog = new CatalogPage(guestPage);
    const guest2Catalog = new CatalogPage(guest2Page);
  
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
      guestCatalog,
      guest2Catalog,
      hostBooking,
      guestBooking,
      guest2Booking,
      slotDate,
    };
  }