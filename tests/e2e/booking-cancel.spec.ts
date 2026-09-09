import { test, expect } from '@playwright/test';
import { makeUser, registerUser, addDate } from '../helpers/user';
import { BookingPage } from '../pages/BookingPage';
import { ProfilePage } from '../pages/ProfilePage';

test.describe('Отмена бронирования', () => {
  test('Отмена слота у хоста и гостя', async ({ browser }) => {
    const runId = Date.now();
    const skillTag = `Playwright-demo-${runId}`;
    const host = makeUser('host', runId);
    const guest = makeUser('guest', runId);

    const hostCtx = await browser.newContext();
    const guestCtx = await browser.newContext();

    const hostPage = await hostCtx.newPage();
    const guestPage = await guestCtx.newPage();

    const hostProfile = new ProfilePage(hostPage);
    const guestBooking = new BookingPage(guestPage);

    let bookingId: string;

    await test.step('Регистрация пользователей', async () => {
      await registerUser(hostPage, host);
      await registerUser(guestPage, guest);
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

    await test.step('Гость: ищет хоста в каталоге по навыку', async () => {
      await guestBooking.searchBySkill(skillTag);
      await guestBooking.openHostCard(host.name);
      await expect(guestBooking.personName).toHaveText(host.name);
    });

    await test.step('Гость: выбирает слот и открывает модалку бронирования', async () => {
      await expect(async () => {
        await guestBooking.selectFirstSlot();
        await expect(guestBooking.confirmDialog).toBeVisible({ timeout: 5_000 });
      }).toPass({ timeout: 15_000 });
    });

    await test.step('Гость: подтверждает бронирование', async () => {
      await guestBooking.clickConfirm();
      await expect(guestBooking.confirmSuccess).toBeVisible({ timeout: 15_000 });
    });

    await test.step('Гость видит бронирование в "Мои встречи"', async () => {
      await guestBooking.goToBookings();

      const firstCard = guestBooking.getFirstUpcomingCard();
      await expect(firstCard).toBeVisible({ timeout: 10_000 });

      bookingId = await guestBooking.getFirstUpcomingBookingId();

      const guestCardName = guestBooking.getUpcomingCardName(bookingId);
      await expect(guestCardName).toHaveText(host.name);
    });

    await test.step('Хост видит бронирование в "Мои встречи"', async () => {
      const hostBooking = new BookingPage(hostPage);
      const hostCard = hostBooking.getBookingCardById(bookingId, 'upcoming');
      const hostCardName = hostBooking.getUpcomingCardName(bookingId);

      await hostBooking.goToBookings();
      await expect(hostCard).toBeVisible({ timeout: 10_000 });
      await expect(hostCardName).toHaveText(guest.name);
    });

    await test.step('Гость отменяет бронирование', async () => {
      const upcomingCard = guestBooking.getBookingCardById(bookingId, 'upcoming');
      await guestBooking.cancelBookingById(bookingId);

      await expect(upcomingCard).toBeHidden({ timeout: 10_000 });
    });

    await test.step('Гость: бронирование переместилось в "Отменённые"', async () => {
      const canceledCard = guestBooking.getBookingCardById(bookingId, 'canceled');
      const canceledName = guestBooking.getCanceledCardName(bookingId);
      const status = guestBooking.getCanceledCardStatus(bookingId);
      await expect(canceledCard).toBeVisible({ timeout: 10_000 });

      await expect(canceledName).toHaveText(host.name);

      await expect(status).toContainText('отменено');
    });

    await test.step('Хост: бронирование переместилось в "Отменённые"', async () => {
      const hostBooking = new BookingPage(hostPage);
      const hostCanceledCard = hostBooking.getBookingCardById(bookingId, 'canceled');
      const hostCanceledName = hostBooking.getCanceledCardName(bookingId);
      const status = hostBooking.getCanceledCardStatus(bookingId);
      await hostBooking.goToBookings();

      await expect(hostCanceledCard).toBeVisible({ timeout: 10_000 });

      await expect(hostCanceledName).toHaveText(guest.name);

      await expect(status).toContainText('отменено');
    });
  });
});
