import { test, expect } from "@playwright/test";
import {
  makeRandom,
  makeUser,
  prepareHost,
  registerUser,
  UTC_CONTEXT_OPTIONS,
} from "../helpers/user";
import {
  bookFirstSlot,
  expectBookingIsCancelled,
  expectEventually,
} from "../helpers/booking";
import { BookingPage } from "../pages/booking-page";

test("отмена встречи гостем, после reload отмену видят гость и хост", async ({
  browser,
}) => {
  const runId = Date.now();
  const skillTag = makeRandom("Playwright-demo");
  const host = makeUser("host", runId);
  const guest = makeUser("guest", runId);

  const hostContext = await browser.newContext(UTC_CONTEXT_OPTIONS);
  const guestContext = await browser.newContext(UTC_CONTEXT_OPTIONS);

  const hostPage = await hostContext.newPage();
  const guestPage = await guestContext.newPage();

  const hostBookingsPage = new BookingPage(hostPage);
  const guestBookingPage = new BookingPage(guestPage);

  try {
    await test.step("Хост: регистрируется, добавляет навык и свободный слот на завтра", async () => {
      await prepareHost(hostPage, host, skillTag);
    });

    await test.step("Гость: регистрируется и бронирует слот хоста", async () => {
      await registerUser(guestPage, guest);
      await bookFirstSlot(guestBookingPage, skillTag, host.name);
    });

    await test.step("Гость: видит бронирование в разделе «Мои встречи»", async () => {
      await guestBookingPage.openUpcomingMeetings(host.name);
      await expect(
        guestBookingPage.upcomingBookingByParticipant(host.name),
      ).toBeVisible();
    });

    await test.step("Гость: отмена встречи с этим хостом", async () => {
      await guestBookingPage.cancelBooking(host.name);
    });

    await test.step("Встреча исчезла из ближайших и появилась в отмененных", async () => {
      await expectBookingIsCancelled(guestBookingPage, host.name);
    });

    await test.step("После reload гость видит отмену", async () => {
      await guestBookingPage.goto();

      await expectEventually(
        () => guestPage.reload(),
        () => expectBookingIsCancelled(guestBookingPage, host.name),
      );
    });

    await test.step("После reload хост видит отмененную встречу с гостем", async () => {
      await hostBookingsPage.goto();

      await expectEventually(
        () => hostPage.reload(),
        () => expectBookingIsCancelled(hostBookingsPage, guest.name),
      );
    });
  } finally {
    await hostContext.close();
    await guestContext.close();
  }
});
