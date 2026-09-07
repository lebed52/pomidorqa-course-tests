import { expect, test } from "@playwright/test";
import { makeUser, registerUser } from "../helpers/user";
import { BookingPage } from "../pages/booking-page";
import { ProfilePage } from "../pages/profile-page";

test.describe("Бронирование: отмена встречи", () => {
  test("гость отменяет встречу, и отмена сохраняется у гостя и хоста после reload", async ({
    browser,
  }) => {
    test.setTimeout(60_000);

    const runId = Date.now();
    const skillTag = `Playwright-cancel-${runId}`;
    const host = makeUser("host", runId);
    const guest = makeUser("guest", runId);

    const hostContext = await browser.newContext();
    const guestContext = await browser.newContext();
    const hostPage = await hostContext.newPage();
    const guestPage = await guestContext.newPage();

    const hostBookingPage = new BookingPage(hostPage);
    const guestBookingPage = new BookingPage(guestPage);
    const hostProfilePage = new ProfilePage(hostPage);

    await test.step("Хост: регистрируется", async () => {
      await registerUser(hostPage, host);
    });

    await test.step("Хост: добавляет навык", async () => {
      await hostProfilePage.open();
      await hostProfilePage.addCanHelpSkill(skillTag);
    });

    await test.step("Хост: добавляет свободный слот на завтра", async () => {
      await hostBookingPage.openSlots();

      const tomorrow = new Date(Date.now() + 24 * 60 * 60 * 1000);
      const date = tomorrow.toISOString().slice(0, 10);

      await hostBookingPage.addSlot(date, "12:00");
    });

    await test.step("Гость: регистрируется", async () => {
      await registerUser(guestPage, guest);
    });

    await test.step("Гость: ищет хоста по навыку", async () => {
      await guestBookingPage.findPersonBySkill(skillTag);
    });

    await test.step("Гость: открывает карточку хоста", async () => {
      await guestBookingPage.openPersonCard(host.name);
    });

    await test.step("Гость: выбирает свободный слот", async () => {
      await guestBookingPage.waitForCalendarSlot();
      await guestBookingPage.chooseFirstSlot();
    });

    await test.step("Гость: подтверждает бронирование", async () => {
      await guestBookingPage.confirmBooking();
    });

    await test.step("Гость: видит успешное бронирование", async () => {
      await expect(guestBookingPage.bookingConfirmSuccess).toBeVisible({
        timeout: 15_000,
      });
    });

    await test.step("Гость: открывает «Мои встречи»", async () => {
      await guestBookingPage.openBookings();
    });

    await test.step("Гость: видит будущую встречу с хостом", async () => {
      await expect(guestBookingPage.bookingCardName()).toHaveText(host.name, {
        timeout: 10_000,
      });
    });

    await test.step("Гость: отменяет встречу", async () => {
      await guestBookingPage.cancelFirstBooking();
    });

    await test.step("Гость: видит, что будущих встреч нет", async () => {
      await expect(guestBookingPage.bookingsCards).toHaveCount(0);
    });

    await test.step("Гость: видит отменённую встречу в прошедших", async () => {
      await expect(guestBookingPage.pastBookingCardName()).toHaveText(host.name);
      await expect(guestBookingPage.pastBookingCardStatus()).toContainText("отменено");
    });

    await test.step("Гость: перезагружает страницу", async () => {
      await guestPage.reload();
    });

    await test.step("После reload гость видит отменённую встречу", async () => {
      await expect(guestBookingPage.pastBookingCardName()).toHaveText(host.name, {
        timeout: 10_000,
      });
      await expect(guestBookingPage.pastBookingCardStatus()).toContainText("отменено");
    });

    await test.step("Хост: открывает «Мои встречи»", async () => {
      await hostBookingPage.openBookings();
    });

    await test.step("Хост: перезагружает страницу", async () => {
      await hostPage.reload();
    });

    await test.step("После reload хост не видит будущую встречу", async () => {
      await expect(hostBookingPage.bookingsCards).toHaveCount(0, {
        timeout: 10_000,
      });
    });

    await test.step("После reload хост видит отменённую встречу", async () => {
      await expect(hostBookingPage.pastBookingCardName()).toHaveText(guest.name, {
        timeout: 10_000,
      });
      await expect(hostBookingPage.pastBookingCardStatus()).toContainText("отменено");
    });

    await hostContext.close();
    await guestContext.close();
  });
});