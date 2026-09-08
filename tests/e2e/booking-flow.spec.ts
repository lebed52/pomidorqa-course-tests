import { test, expect } from "@playwright/test";
import { dateInDays, makeUser, registerInNewContext } from "../helpers/user";
import { ProfilePage } from "../pages/profile-page";
import { SlotsPage } from "../pages/slots-page";
import { BookingPage } from "../pages/booking-page";

test("гонка за слот: хост выкладывает слот, первый гость бронирует, второй видит ошибку", async ({
  browser,
}) => {
  // Сценарий держит три браузерных контекста и ждёт бронь на живом стенде —
  // стандартных 30 секунд из конфига ему не хватает.
  test.setTimeout(60_000);

  const runId = Date.now();
  const skillTag = `Playwright-demo-${runId}`;
  const host = makeUser("host", runId);
  const guest = makeUser("guest", runId);
  const guest2 = makeUser("guest2", runId);

  const hostPage = await registerInNewContext(browser, host);
  const guestPage = await registerInNewContext(browser, guest);
  const guest2Page = await registerInNewContext(browser, guest2);

  const hostProfile = new ProfilePage(hostPage);
  const hostSlots = new SlotsPage(hostPage);
  const guestBooking = new BookingPage(guestPage);
  const guest2Booking = new BookingPage(guest2Page);

  await test.step("Хост добавляет навык «могу помочь»", async () => {
    await hostProfile.open();
    await hostProfile.addSkill(skillTag, "can_help");
    await expect(hostProfile.canHelpSkills).toContainText(skillTag);
  });

  await test.step("Хост добавляет свободный слот на завтра", async () => {
    await hostSlots.open();
    await hostSlots.addSlot(dateInDays(1), "12:00");
    await expect(hostSlots.slotCards.first()).toBeVisible();
  });

  await test.step("Гость находит хоста в каталоге по навыку", async () => {
    await guestBooking.searchBySkill(skillTag);
    await expect(guestBooking.personCard(host.name)).toBeVisible();
  });

  await test.step("Гость открывает карточку хоста и окно бронирования", async () => {
    await guestBooking.openPersonCard(host.name);
    await expect(guestBooking.personName).toHaveText(host.name);
    await guestBooking.openFirstSlot();
    await expect(guestBooking.confirmDialog).toBeVisible();
  });

  await test.step("Второй гость открывает то же окно, пока слот ещё свободен", async () => {
    await guest2Booking.searchBySkill(skillTag);
    await guest2Booking.openPersonCard(host.name);
    await expect(guest2Booking.personName).toHaveText(host.name);
    await guest2Booking.openFirstSlot();
    await expect(guest2Booking.confirmDialog).toBeVisible();
  });

  await test.step("Гость подтверждает первым — бронирование прошло", async () => {
    await guestBooking.confirmBooking();
    await expect(guestBooking.confirmSuccess).toBeVisible({ timeout: 15_000 });
  });

  await test.step("Второй гость подтверждает тот же слот — видит ошибку", async () => {
    await guest2Booking.confirmBooking();
    await expect(guest2Booking.confirmError).toBeVisible({ timeout: 15_000 });
    await expect(guest2Booking.confirmSuccess).toBeHidden();
  });

  await test.step("Гость видит встречу с хостом в «Мои встречи»", async () => {
    await expect(async () => {
      await guestBooking.openMyMeetings();
      await expect(guestBooking.firstMeetingName()).toHaveText(host.name);
    }).toPass({ timeout: 10_000 });
  });

  await test.step("Хост видит ту же встречу с гостем", async () => {
    const hostBooking = new BookingPage(hostPage);
    await expect(async () => {
      await hostBooking.openMyMeetings();
      await expect(hostBooking.firstMeetingName()).toHaveText(guest.name);
    }).toPass({ timeout: 10_000 });
  });

  await hostPage.context().close();
  await guestPage.context().close();
  await guest2Page.context().close();
});
