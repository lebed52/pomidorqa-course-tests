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
  const hostBooking = new BookingPage(hostPage);

  await test.step("Хост добавляет навык «могу помочь»", async () => {
    await hostProfile.open();
    await hostProfile.addSkill(skillTag, "can_help");
  });

  await test.step("Навык появился в блоке «могу помочь»", async () => {
    await expect(hostProfile.canHelpSkills).toContainText(skillTag);
  });

  await test.step("Хост добавляет свободный слот на завтра", async () => {
    await hostSlots.open();
    await hostSlots.addSlot(dateInDays(1), "12:00");
  });

  await test.step("Слот появился в списке хоста", async () => {
    await expect(hostSlots.slotCards.first()).toBeVisible();
  });

  await test.step("Гость ищет хоста в каталоге по навыку", async () => {
    await guestBooking.searchBySkill(skillTag);
  });

  await test.step("Хост нашёлся в результатах поиска", async () => {
    await expect(guestBooking.personCard(host.name)).toBeVisible();
  });

  await test.step("Гость открывает карточку хоста и окно бронирования", async () => {
    await guestBooking.openPersonCard(host.name);
    await guestBooking.openFirstSlot();
  });

  await test.step("Гость видит окно брони на странице хоста", async () => {
    await expect(guestBooking.personName).toHaveText(host.name);
    await expect(guestBooking.confirmDialog).toBeVisible();
  });

  await test.step("Второй гость открывает то же окно, пока слот ещё свободен", async () => {
    await guest2Booking.searchBySkill(skillTag);
    await guest2Booking.openPersonCard(host.name);
    await guest2Booking.openFirstSlot();
  });

  await test.step("Второй гость видит окно брони на том же слоте", async () => {
    await expect(guest2Booking.personName).toHaveText(host.name);
    await expect(guest2Booking.confirmDialog).toBeVisible();
  });

  await test.step("Гость подтверждает бронь первым", async () => {
    await guestBooking.confirmBooking();
  });

  await test.step("Бронирование прошло", async () => {
    await expect(guestBooking.confirmSuccess).toBeVisible({ timeout: 15_000 });
  });

  await test.step("Второй гость подтверждает тот же слот", async () => {
    await guest2Booking.confirmBooking();
  });

  await test.step("Второй гость видит ошибку, брони у него нет", async () => {
    await expect(guest2Booking.confirmError).toBeVisible({ timeout: 15_000 });
    await expect(guest2Booking.confirmSuccess).toBeHidden();
  });

  await test.step("Гость открывает «Мои встречи»", async () => {
    await guestBooking.openMyMeetings();
  });

  await test.step("Гость видит встречу с хостом", async () => {
    await expect(guestBooking.firstMeetingName()).toHaveText(host.name, { timeout: 10_000 });
  });

  await test.step("Хост открывает «Мои встречи»", async () => {
    await hostBooking.openMyMeetings();
  });

  await test.step("Хост видит ту же встречу с гостем", async () => {
    await expect(hostBooking.firstMeetingName()).toHaveText(guest.name, { timeout: 10_000 });
  });

  await hostPage.context().close();
  await guestPage.context().close();
  await guest2Page.context().close();
});
