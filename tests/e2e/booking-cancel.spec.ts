import { test, expect } from "@playwright/test";
import { makeUser, registerUser } from "../helpers/user";
import { createHostAndGuestContexts, closeApps, expectEventually } from "../helpers/booking";

test("гость отменяет бронь — карточка уходит в прошедшие у гостя и хоста", async ({ browser }) => {
  test.setTimeout(60_000);

  const skillTag = `Cancel-demo-${Date.now()}`;
  const hostUser = makeUser("host");
  const guestUser = makeUser("guest");
  const { hostApp, guestApp } = await createHostAndGuestContexts(browser);

  try {
    await test.step("Хост: регистрируется, добавляет навык и свободный слот", async () => {
      await registerUser(hostApp.page, hostUser);
      await hostApp.profilePage.goto();
      await hostApp.profilePage.addSkill(skillTag, "can_help");
      await hostApp.slotsPage.goto();
      await hostApp.slotsPage.addSlot("12:00");
    });

    await test.step("Гость: находит хоста и бронирует слот", async () => {
      await registerUser(guestApp.page, guestUser);
      await guestApp.bookingPage.searchCatalog(skillTag);
      await guestApp.bookingPage.openPerson(hostUser.name);
      await guestApp.bookingPage.pickFirstSlot();
      await guestApp.bookingPage.confirmBooking();
      const result = await guestApp.bookingPage.waitForBookingResult();
      if (result === "error") {
        const errorText = await guestApp.bookingPage.confirmError.textContent();
        throw new Error(`Бронирование не удалось: ${errorText}`);
      }
    });

    await test.step("Гость: отменяет бронь", async () => {
      await guestApp.bookingPage.goToBookings();
      await guestApp.bookingPage.cancelFirstBooking();
    });

    await test.step("После reload гость видит: слот пропал из ближайших и появился в прошедших", async () => {
      await expectEventually(
        () => guestApp.page.reload(),
        async () => {
          await expect(guestApp.bookingPage.upcomingBookings).toHaveCount(0);
          await expect(guestApp.bookingPage.pastBookings).toHaveCount(1);
          await expect(guestApp.bookingPage.firstPastBookingName).toHaveText(hostUser.name);
          await expect(guestApp.bookingPage.pastBookings.first()).toContainText("отменено");
        }
      );
    });

    await test.step("После reload хост тоже видит: слот пропал из ближайших и появился в прошедших", async () => {
      await hostApp.bookingPage.goToBookings();
      await expectEventually(
        () => hostApp.page.reload(),
        async () => {
          await expect(hostApp.bookingPage.upcomingBookings).toHaveCount(0);
          await expect(hostApp.bookingPage.pastBookings).toHaveCount(1);
          await expect(hostApp.bookingPage.firstPastBookingName).toHaveText(guestUser.name);
          await expect(hostApp.bookingPage.pastBookings.first()).toContainText("отменено");
        }
      );
    });
  } finally {
    await closeApps([hostApp, guestApp]);
  }
});