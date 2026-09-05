import { test, expect } from "@playwright/test";

import { makeUser, registerUser } from "../helpers/user";

import { ProfilePage } from "../pages/profile-page";

import { BookingPage } from "../pages/booking-page";

test("гость бронирует и отменяет встречу", async ({ browser }) => {
  test.setTimeout(120_000);

  const runId = Date.now();

  const skillTag = `Playwright-cancel-${runId}`;

  const tomorrow = new Date(Date.now() + 24 * 60 * 60 * 1000);

  const slotDate = tomorrow.toISOString().slice(0, 10);

  const host = makeUser("host", runId);

  const guest = makeUser("guest", runId);

  const hostContext = await browser.newContext();

  const guestContext = await browser.newContext();

  const hostPage = await hostContext.newPage();

  const guestPage = await guestContext.newPage();

  const hostProfile = new ProfilePage(hostPage);

  const hostBooking = new BookingPage(hostPage);

  const guestBooking = new BookingPage(guestPage);

  try {
    await test.step("Хост: регистрируется", async () => {
      await registerUser(hostPage, host);
    });

    await test.step("Хост: добавляет навык", async () => {
      await hostPage.goto("/pomidorqa/profile");
      await hostProfile.addSkill(skillTag);
    });

    await test.step(
      "Хост: добавляет свободный слот на завтра в 12:00",
      async () => {
        await hostPage.goto("/pomidorqa/profile/slots");
        await hostBooking.addSlot(slotDate, "12:00");
      },
    );

    await test.step("Проверяем, что свободный слот создан", async () => {
      await expect(hostBooking.freeSlot()).toBeVisible({
        timeout: 15000,
      });
    });

    await test.step("Гость: регистрируется", async () => {
      await registerUser(guestPage, guest);
    });

    await test.step("Гость: находит хоста и открывает его карточку", async () => {
      await guestBooking.searchBySkill(skillTag);
      await guestBooking.openHostCard(host.name);
    });

    await test.step("Гость: выбирает свободный слот", async () => {
      await expect(async () => {
        await guestBooking.selectDayAndTime(slotDate);
      }).toPass({
        timeout: 30000,
        intervals: [1000, 2000, 5000],
      });
    });

    await test.step("Проверяем, что открылось окно бронирования", async () => {
      await expect(guestBooking.bookingDialog()).toBeVisible();
    });

    await test.step("Гость: подтверждает бронирование", async () => {
      await guestBooking.confirmBooking();
    });

    await test.step("Проверяем, что бронирование прошло успешно", async () => {
      await expect(guestBooking.bookingSuccess()).toBeVisible({
        timeout: 15000,
      });
    });

    await test.step("Гость: открывает «Мои встречи»", async () => {
      await guestBooking.goToBookings();
    });

    await test.step(
      "Проверяем, что встреча отображается в «Мои встречи»",
      async () => {
        await expect(guestBooking.upcomingSection()).toBeVisible({
          timeout: 10000,
        });
        await expect(guestBooking.upcomingCardName()).toHaveText(host.name);
      },
    );

    await test.step("Гость: отменяет встречу", async () => {
      await guestBooking.cancelBooking();
    });

    await test.step("Проверяем, что встреча перешла в прошедшие", async () => {
      await expect(guestBooking.pastBookingCard(host.name)).toBeVisible();
    });

    await test.step("Гость: обновляет страницу", async () => {
      await guestPage.reload();
    });

    await test.step(
      "Проверяем после reload, что отмена видна гостю",
      async () => {
        await expect(guestBooking.pastBookingCard(host.name)).toBeVisible();
      },
    );

    await test.step("Хост: открывает «Мои встречи»", async () => {
      await hostBooking.goToBookings();
    });

    await test.step(
      "Проверяем после reload, что отмена видна хосту",
      async () => {
        await expect(hostBooking.pastBookingCard(guest.name)).toBeVisible();
      },
    );
  } finally {
    await hostContext.close();
    await guestContext.close();
  }
});