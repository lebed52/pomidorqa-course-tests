import { test, expect } from "@playwright/test";
import { makeUser, registerUser } from "../helpers/user";
import { ProfilePage } from "../pages/profile-page";
import { BookingPage } from "../pages/booking-page";

test("Отменённая бронь уходит из «Ближайших» в «Прошедшие и отменённые» у гостя и у хоста", async ({
  browser,
}) => {
  const runId = Date.now();
  const skillTag = `Cancel-demo-${runId}`;
  const host = makeUser("host", runId);
  const guest = makeUser("guest", runId);

   const hostContext = await browser.newContext();
  const guestContext = await browser.newContext();
  const hostPage = await hostContext.newPage();
  const guestPage = await guestContext.newPage();

  const hostProfile = new ProfilePage(hostPage);
  const hostBooking = new BookingPage(hostPage);
  const guestBooking = new BookingPage(guestPage);

  await test.step("Хост: регистрируется в PomidorQA", async () => {
    await registerUser(hostPage, host);
  });

  await test.step("Хост: добавляет навык «могу помочь» в профиле", async () => {
    await hostProfile.open();
    await hostProfile.addSkill(skillTag, "can_help");
  });

  await test.step("Хост: навык виден в блоке «могу помочь»", async () => {
    await expect(hostProfile.canHelpSkills).toContainText(skillTag);
  });

  await test.step("Хост: добавляет свободный слот на завтра", async () => {
    await hostBooking.openSlots();
    const tomorrow = new Date(Date.now() + 24 * 60 * 60 * 1000);
    const date = tomorrow.toISOString().slice(0, 10);
    await hostBooking.addSlot(date, "12:00");
  });

  await test.step("Хост: слот на завтра есть в списке слотов", async () => {
    await expect(hostBooking.slotCards.first()).toBeVisible();
  });

  await test.step("Гость: регистрируется отдельным аккаунтом", async () => {
    await registerUser(guestPage, guest);
  });

  await test.step("Гость: ищет хоста в каталоге по навыку", async () => {
    await guestBooking.searchInCatalog(skillTag);
  });

  await test.step("Гость: хост нашёлся в каталоге", async () => {
    await expect(guestBooking.catalogCardByName(host.name)).toBeVisible();
  });

  await test.step("Гость: открывает карточку хоста", async () => {
    await guestBooking.openPersonCard(host.name);
  });

  await test.step("Гость: открыта карточка хоста", async () => {
    await expect(guestBooking.personName).toHaveText(host.name);
  });

  await test.step("Гость: видит день со слотом в календаре", async () => {
    await expect(async () => {
      const dayChip = guestBooking.calendarDays.first();
      if (!(await dayChip.isVisible().catch(() => false))) {
        await guestBooking.reload();
      }
      await expect(dayChip).toBeVisible();
    }).toPass({ timeout: 10_000 });
  });

  await test.step("Гость: выбирает день и время слота", async () => {
    await guestBooking.pickFirstDayAndTime();
  });

  await test.step("Гость: открыт диалог подтверждения брони", async () => {
    await expect(guestBooking.confirmDialog).toBeVisible();
  });

  await test.step("Гость: подтверждает бронирование", async () => {
    await guestBooking.confirmBooking();
  });

  await test.step("Гость: бронирование прошло без ошибки", async () => {
    await expect(guestBooking.confirmSuccess.or(guestBooking.confirmError)).toBeVisible({
      timeout: 15_000,
    });
    await expect(guestBooking.confirmError).toBeHidden();
  });

  await test.step("Гость: бронь появилась в «Ближайших»", async () => {
    await expect(async () => {
      await guestBooking.openBookings();
      await expect(guestBooking.upcomingCardByName(host.name)).toBeVisible();
    }).toPass({ timeout: 10_000 });
  });

  await test.step("Хост: тоже видит бронь в «Ближайших» до отмены", async () => {
    await expect(async () => {
      await hostBooking.openBookings();
      await expect(hostBooking.upcomingCardByName(guest.name)).toBeVisible();
    }).toPass({ timeout: 10_000 });
  });

  await test.step("Гость: отменяет бронь", async () => {
    await guestBooking.cancelBooking(host.name);
  });

  await test.step("Гость: после reload бронь ушла в «Прошедшие и отменённые»", async () => {
    await expect(async () => {
      await guestBooking.reload();
      await expect(guestBooking.upcomingCardByName(host.name)).toBeHidden();
      await expect(guestBooking.pastCardByName(host.name)).toBeVisible();
    }).toPass({ timeout: 10_000 });
  });

  await test.step("Хост: после reload тоже видит отменённую бронь в «Прошедших»", async () => {
    await expect(async () => {
      await hostBooking.openBookings();
      await expect(hostBooking.upcomingCardByName(guest.name)).toBeHidden();
      await expect(hostBooking.pastCardByName(guest.name)).toBeVisible();
    }).toPass({ timeout: 10_000 });
  });

  await hostContext.close();
  await guestContext.close();
});
