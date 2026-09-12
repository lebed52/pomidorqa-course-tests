import { expect } from "@playwright/test";
import { BookingPage } from "../pages/booking-page";

export async function expectEventually(
  refresh: () => Promise<unknown>,
  assertion: () => Promise<void>,
) {
  await expect(async () => {
    await refresh();
    await assertion();
  }).toPass({ timeout: 15_000, intervals: [1000, 2000, 5000] });
}

export function getCancelledBookingCheck(
  bookingPage: BookingPage,
  participantName: string,
) {
  return {
    upcomingCountLocator:
      bookingPage.upcomingBookingByParticipant(participantName),
    pastBookingLocator: bookingPage.pastBookingByParticipant(participantName),
  };
}

export const expectBookingIsCancelled = async (
  bookingPage: BookingPage,
  participantName: string,
) => {
  const check = getCancelledBookingCheck(bookingPage, participantName);
  await expect(check.upcomingCountLocator).toHaveCount(0);
  await expect(check.pastBookingLocator).toBeVisible();
  await expect(check.pastBookingLocator).toContainText("отменено");
};
