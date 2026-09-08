import { test, expect } from "@playwright/test";
import { makeUser, registerUser } from "../helpers/user";
import { SlotsPage } from "../pages/slots-page";
import { ProfilePage } from "../pages/profile-page";
import { BookingPage } from "../pages/booking-page";
import { expectEventually, expectBookingIsCancelled } from "../helpers/booking";

test("отмена встречи гостем, после reload отмену видят гость и хост", async ({
  browser,
}) => {
  const runId = Date.now();
  const uniqueId = Math.random().toString(36).slice(2, 8);
  const skillTag = `Playwright-demo-${runId}-${uniqueId}`;

  const host = makeUser("host", runId);
  const guest = makeUser("guest", runId);

  const contextOptions = {
    timezoneId: "UTC",
  };

  const hostContext = await browser.newContext(contextOptions);
  const guestContext = await browser.newContext(contextOptions);

  const hostPage = await hostContext.newPage();
  const guestPage = await guestContext.newPage();

  const hostProfile = new ProfilePage(hostPage);
  const hostSlots = new SlotsPage(hostPage);
  const hostBookingsPage = new BookingPage(hostPage);
  const guestBookingPage = new BookingPage(guestPage);

  try {
    await test.step("Хост: регистрируется в PomidorQA и добавляет уникальный навык", async () => {
      await registerUser(hostPage, host);
      await hostProfile.goto();
      await hostProfile.addSkill(skillTag, "can_help");
    });

    await test.step("Хост: добавляет свободный слот на завтра", async () => {
      await hostSlots.goto();
      await hostSlots.addSlot("12:00");
    });

    await test.step("Гость: регистрируется и находит хоста по навыку", async () => {
      await registerUser(guestPage, guest);
      await guestBookingPage.navigateToHostProfile(skillTag, host.name);
    });

    await test.step("Гость: выбирает слот", async () => {
      await guestBookingPage.selectFirstSlot();
    });

    await test.step("Открылось подтверждение бронирования", async () => {
      await expect(guestBookingPage.confirmDialog).toBeVisible({
        timeout: 10_000,
      });
    });

    await test.step("Гость подтверждает бронь", async () => {
      await guestBookingPage.confirmBooking();

      const isSuccess = await guestBookingPage.waitForBookingStatus();
      if (!isSuccess) {
        const errorText = await guestBookingPage.errorAlert.textContent();
        throw new Error(`Бронирование не удалось: ${errorText}`);
      }
    });

    await test.step("Бронирование успешно", async () => {
      await expect(guestBookingPage.successStatus).toBeVisible();
    });

    await test.step("Гость: видит бронирование в разделе «Мои встречи»", async () => {
      await guestBookingPage.loadUpcomingMeetingsAndEnsureData(host.name);
      await expect(guestBookingPage.firstCardName).toHaveText(host.name);
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
