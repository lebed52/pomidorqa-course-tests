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

export async function expectBookingSucceeds(bookingPage: BookingPage) {
  const isSuccess = await bookingPage.waitForBookingStatus();
  if (!isSuccess) {
    const errorText = await bookingPage.errorAlert.textContent();
    throw new Error(`Бронирование не удалось: ${errorText}`);
  }
  await expect(bookingPage.successStatus).toBeVisible();
}

export async function expectBookingFails(bookingPage: BookingPage) {
  const isSuccess = await bookingPage.waitForBookingStatus();
  if (isSuccess) {
    throw new Error(
      "Бронирование должно было отклониться — слот уже занят, но прошло успешно",
    );
  }
  await expect(bookingPage.errorAlert).toBeVisible();
}

export async function openBookingDialogForFirstSlot(
  bookingPage: BookingPage,
  skillTag: string,
  hostName: string,
) {
  await bookingPage.navigateToHostProfile(skillTag, hostName);
  await expect(bookingPage.personHeading).toHaveText(hostName);

  await bookingPage.ensureCalendarVisible();
  await bookingPage.selectFirstSlot();
  await expect(bookingPage.confirmDialog).toBeVisible();
}

export async function bookFirstSlot(
  bookingPage: BookingPage,
  skillTag: string,
  hostName: string,
) {
  await openBookingDialogForFirstSlot(bookingPage, skillTag, hostName);
  await bookingPage.confirmBooking();
  await expectBookingSucceeds(bookingPage);
}
