import { test, expect } from "@playwright/test";
import { makeUser, registerUser } from "../helpers/user";
import { registerHostWithSkill, addOpenSlot } from "../helpers/host";
import { ProfilePage } from "../pages/profile-page";
import { BookingPage } from "../pages/booking-page";

test("гость отменяет встречу: карточка уходит в прошедшие, отмену видят оба", async ({
  browser,
}) => {
  test.setTimeout(120_000);

  const runId = Date.now();
  const skillTag = `Playwright-cancel-${runId}`;
  const host = makeUser("host", runId);
  const guest = makeUser("guest", runId);

  const hostContext = await browser.newContext();
  const guestContext = await browser.newContext();
  const hostPage = await hostContext.newPage();
  const guestPage = await guestContext.newPage();

  const hostProfile = new ProfilePage(hostPage);
  const hostBooking = new BookingPage(hostPage);
  const guestBooking = new BookingPage(guestPage);

  const tomorrow = new Date(Date.now() + 24 * 60 * 60 * 1000);
  const slotDate = tomorrow.toISOString().slice(0, 10);

  try {
    await test.step("Хост: регистрируется и добавляет навык «могу помочь»", async () => {
      await registerHostWithSkill(hostPage, host, skillTag);
    });

    await test.step("Навык появился в блоке «могу помочь»", async () => {
      await expect(hostProfile.canHelpSkills).toContainText(skillTag);
    });

    await test.step("Хост: добавляет свободный слот на завтра", async () => {
      await addOpenSlot(hostPage, slotDate);
    });

    await test.step("Слот появился в списке", async () => {
      await expect(hostBooking.slotsCard.first()).toBeVisible();
    });

    await test.step("Гость: регистрируется отдельным аккаунтом", async () => {
      await registerUser(guestPage, guest);
    });

    await test.step("Гость: ищет хоста в каталоге по навыку", async () => {
      await guestBooking.searchInCatalog(skillTag);
    });

    await test.step("В каталоге появилась карточка хоста", async () => {
      await expect(guestBooking.personCardByName(host.name)).toBeVisible();
    });

    await test.step("Гость: открывает карточку хоста", async () => {
      await guestBooking.openPersonCard(host.name);
    });

    await test.step("Карточка хоста открыта", async () => {
      await expect(guestBooking.personName).toHaveText(host.name);
    });

    await test.step("Гость: выбирает день и время в календаре слотов", async () => {
      await expect(async () => {
        await guestBooking.ensureCalendarLoaded();
      }).toPass({ timeout: 10_000 });
      await guestBooking.selectFirstSlot();
    });

    await test.step("Открылся диалог подтверждения брони", async () => {
      await expect(guestBooking.confirmDialog).toBeVisible();
    });

    await test.step("Гость: подтверждает бронирование", async () => {
      await guestBooking.confirmBooking();
    });

    await test.step("Бронирование прошло успешно", async () => {
      await expect(guestBooking.confirmSuccess).toBeVisible({ timeout: 15_000 });
    });

    await test.step("Гость: открывает «Мои встречи»", async () => {
      await expect(async () => {
        await guestBooking.openBookingsUntilCardVisible(host.name);
      }).toPass({ timeout: 10_000 });
    });

    await test.step("Встреча с хостом появилась в «Ближайших»", async () => {
      await expect(guestBooking.bookingCardByName(host.name)).toBeVisible();
    });

    await test.step("Гость: отменяет встречу", async () => {
      await guestBooking.cancelBooking(host.name);
    });

    await test.step("У гостя карточка встречи ушла из «Ближайших»", async () => {
      await expect(guestBooking.bookingCardByName(host.name)).not.toBeVisible({
        timeout: 10_000,
      });
    });

    await test.step("Карточка появилась в «Прошедших и отменённых» с пометкой «отменено»", async () => {
      const pastCard = guestBooking.pastCardByName(host.name);
      await expect(pastCard).toBeVisible();
      await expect(pastCard).toContainText("отменено");
    });

    await test.step("Гость: перезагружает страницу", async () => {
      await guestBooking.reload();
    });

    await test.step("После перезагрузки отмена на месте", async () => {
      const pastCard = guestBooking.pastCardByName(host.name);
      await expect(pastCard).toBeVisible();
      await expect(pastCard).toContainText("отменено");
    });

    await test.step("Хост: открывает свои «Мои встречи»", async () => {
      await hostBooking.openBookings();
    });

    await test.step("Хост видит отменённую встречу именно с этим гостем", async () => {
      const hostPastCard = hostBooking.pastCardByName(guest.name);
      await expect(hostPastCard).toBeVisible();
      await expect(hostPastCard).toContainText("отменено");
    });
  } finally {
    await hostContext.close();
    await guestContext.close();
  }
});
