import { test, expect, BrowserContext } from '@playwright/test';
import { makeUser, registerUser, addDate, cleanupUsersViaApi } from '../helpers/user';
import { BookingPage } from '../pages/BookingPage';
import { ProfilePage } from '../pages/ProfilePage';

test.describe('Бронирование, гонка за слот', () => {
  let hostContext: BrowserContext;
  let guestContext: BrowserContext;
  let guest2Context: BrowserContext;

  test.afterEach(async () => {
    await cleanupUsersViaApi([hostContext, guestContext, guest2Context]);
  });

  test('основной путь + гонка за слот', async ({ browser }) => {
    const runId = Date.now();
    const skillTag = `Playwright-demo-${runId}`;
    const host = makeUser('host', runId);
    const guest = makeUser('guest', runId);
    const guest2 = makeUser('guest2', runId);

    hostContext = await browser.newContext();
    guestContext = await browser.newContext();
    guest2Context = await browser.newContext();

    const hostPage = await hostContext.newPage();
    const guestPage = await guestContext.newPage();
    const guest2Page = await guest2Context.newPage();

    const hostProfile = new ProfilePage(hostPage);
    const guestBooking = new BookingPage(guestPage);
    const guest2Booking = new BookingPage(guest2Page);

    await test.step('Хост: регистрация', async () => {
      await registerUser(hostContext.request, host);
    });

    await test.step('Хост: добавляет навык "Могу помочь"', async () => {
      await hostProfile.goto();
      await hostProfile.addSkill(skillTag, 'can_help');
      await expect(hostProfile.canHelpSkills).toContainText(skillTag);
    });

    await test.step('Хост: добавляет свободный слот на завтра', async () => {
      const date = addDate();
      await hostProfile.goToSlots();
      await hostProfile.addSlot(date, '12:00');
      await expect(hostProfile.slotCard.first()).toBeVisible();
    });

    await test.step('Гость: регистрация', async () => {
      await registerUser(guestContext.request, guest);
    });

    await test.step('Гость: ищет хоста в каталоге по навыку', async () => {
      await guestBooking.openCatalog();
      await guestBooking.searchInCatalog(skillTag);
      await guestBooking.openPersonCard(host.name);
      await expect(guestBooking.personName).toHaveText(host.name);
    });

    await test.step('Гость: выбирает слот и открывает модалку бронирования', async () => {
      await expect(async () => {
        await guestBooking.selectFirstSlot();
        await expect(guestBooking.confirmDialog).toBeVisible();
      }).toPass({ timeout: 15_000 });
    });

    await test.step('Гость2: регистрация', async () => {
      await registerUser(guest2Context.request, guest2);
    });

    await test.step('Гость2: ищет хоста в каталоге по навыку', async () => {
      await guest2Booking.openCatalog();
      await guest2Booking.searchInCatalog(skillTag);
      await guest2Booking.openPersonCard(host.name);
      await expect(guest2Booking.personName).toHaveText(host.name);
    });

    await test.step('Гость2: выбирает тот же слот и открывает модалку', async () => {
      await expect(async () => {
        await guest2Booking.selectFirstSlot();
        await expect(guest2Booking.confirmDialog).toBeVisible({ timeout: 5_000 });
      }).toPass({ timeout: 15_000 });
    });

    await test.step('Гость: подтверждает бронирование', async () => {
      await guestBooking.clickConfirm();
      await expect(guestBooking.confirmSuccess).toBeVisible({ timeout: 15_000 });
    });

    await test.step('Гость2: пытается забронировать занятый слот — видит ошибку', async () => {
      await guest2Booking.clickConfirm();
      await expect(guest2Booking.confirmError).toBeVisible({ timeout: 15_000 });
      await expect(guest2Booking.confirmSuccess).toBeHidden();
    });

    await test.step('Гость видит бронирование в "Мои встречи"', async () => {
      await expect(async () => {
        await guestBooking.goToBookings();
        const bookingId = await guestBooking.getFirstUpcomingBookingId();
        const name = await guestBooking.getBookingName(bookingId, 'upcoming');
        expect(name).toBe(host.name);
      }).toPass({ timeout: 30_000 });
    });

    await test.step('Хост видит бронирование в "Мои встречи"', async () => {
      const hostBooking = new BookingPage(hostPage);
      await expect(async () => {
        await hostBooking.goToBookings();
        const bookingId = await hostBooking.getFirstUpcomingBookingId();
        const name = await hostBooking.getBookingName(bookingId, 'upcoming');
        expect(name).toBe(guest.name);
      }).toPass({ timeout: 30_000 });
    });
  });
});
