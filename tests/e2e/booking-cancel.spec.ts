import { test, expect } from "@playwright/test";
import { makeUser, registerUser } from "../helpers/user";
import { BookingPage } from "../pages/booking-page";
import { ProfilePage } from "../pages/profile-page";

test.describe("Отмена брони", () => {
  test("гость отменяет бронь — карточка в прошедших у обоих после reload", async ({
    browser,
  }) => {
    const runId = Date.now();
    const skillTag = `Playwright-demo-${runId}`;
    const host = makeUser("host", runId);
    const guest = makeUser("guest", runId);

    const hostContext = await browser.newContext();
    const guestContext = await browser.newContext();
    const hostPage = await hostContext.newPage();
    const guestPage = await guestContext.newPage();

    const hostProfile = new ProfilePage(hostPage);
    const guestProfile = new ProfilePage(guestPage);
    const hostBooking = new BookingPage(hostPage);
    const guestBooking = new BookingPage(guestPage);

    try {
      await test.step("Хост: регистрируется в PomidorQA", async () => {
        await registerUser(hostPage, host);
      });

      await test.step("Хост: заполняет профиль и добавляет навык", async () => {
        await hostProfile.goto();
        await hostProfile.fillProfileName(host.name);
        await hostProfile.fillProfileTelegram(`@host_${runId}`);
        await hostProfile.fillProfileBio(`Хост, прогон ${runId}`);
        await hostProfile.saveProfile();
        await hostProfile.goto();
        await hostProfile.addSkill(skillTag);
        await expect(hostProfile.canHelpSkills).toContainText(skillTag);
      });

      await test.step("Хост: добавляет свободный слот", async () => {
        await hostBooking.gotoSlots();
        await hostBooking.addTomorrowSlot();
        await expect(hostBooking.slotCard.first()).toBeVisible();
      });

      await test.step("Гость: регистрируется в PomidorQA", async () => {
        await registerUser(guestPage, guest);
      });

      await test.step("Гость: заполняет профиль", async () => {
        await guestProfile.goto();
        await guestProfile.fillProfileName(guest.name);
        await guestProfile.fillProfileTelegram(`@guest_${runId}`);
        await guestProfile.fillProfileBio(`Гость, прогон ${runId}`);
        await guestProfile.saveProfile();
      });

      await test.step("Гость: бронирует слот хоста", async () => {
        await guestBooking.search(skillTag);
        await guestBooking.openPerson(host.name);
        await expect(guestBooking.personName).toHaveText(host.name);
        await guestBooking.openFirstSlot();
        await expect(guestBooking.bookingConfirmDialog).toBeVisible();
        await guestBooking.confirm();
        await expect(guestBooking.bookingConfirmSuccess).toBeVisible({
          timeout: 15_000,
        });
        await expect(guestBooking.bookingConfirmError).toBeHidden();
      });

      await test.step("Гость: отменяет бронь", async () => {
        await guestBooking.cancelBooking();
      });

      await test.step("У гостя карточка в прошедших", async () => {
        await expect(guestBooking.upcomingEmpty).toBeVisible();
        await expect(guestBooking.pastHeading).toBeVisible();
        await expect(guestBooking.meetingByName(host.name)).toBeVisible();
        await expect(guestBooking.cancelledStatus).toBeVisible();
      });

      await test.step("После reload гость видит отмену", async () => {
        await guestPage.reload();
        await expect(guestBooking.upcomingEmpty).toBeVisible();
        await expect(guestBooking.meetingByName(host.name)).toBeVisible();
        await expect(guestBooking.cancelledStatus).toBeVisible();
      });

      await test.step("После reload хост видит отмену", async () => {
        await hostBooking.gotoBookings();
        await hostPage.reload();
        await expect(hostBooking.upcomingEmpty).toBeVisible();
        await expect(hostBooking.meetingByName(guest.name)).toBeVisible();
        await expect(hostBooking.cancelledStatus).toBeVisible();
      });
    } finally {
      await hostContext.close();
      await guestContext.close();
    }
  });
});
