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
      await hostProfile.goToSlots();
      const date = addDate();
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

      await expect(guestBooking.upcomingSection.locator('[data-booking-id]').first()).toBeVisible({
        timeout: 10_000,
      });

      bookingId = await guestBooking.getFirstUpcomingBookingId();

      const guestCard = guestBooking.getBookingCardById(bookingId, 'upcoming');
      await expect(guestCard.locator('p').first()).toHaveText(host.name);
    });

    await test.step('Хост видит бронирование в "Мои встречи"', async () => {
      const hostBooking = new BookingPage(hostPage);
      await hostBooking.goToBookings();

      const hostCard = hostBooking.getBookingCardById(bookingId, 'upcoming');
      await expect(hostCard).toBeVisible({ timeout: 10_000 });
      await expect(hostCard.locator('p').first()).toHaveText(guest.name);
    });

    await test.step('Гость отменяет бронирование', async () => {
      await guestBooking.cancelBookingById(bookingId);

      const upcomingCard = guestBooking.getBookingCardById(bookingId, 'upcoming');
      await expect(upcomingCard).toBeHidden({ timeout: 10_000 });
    });

    await test.step('Гость: бронирование переместилось в "Отменённые"', async () => {
      const canceledCard = guestBooking.getBookingCardById(bookingId, 'canceled');
      await expect(canceledCard).toBeVisible({ timeout: 10_000 });
      await expect(canceledCard.locator('p').first()).toHaveText(host.name);

      const statusText = await canceledCard.locator('p').nth(1).textContent();
      expect(statusText).toContain('отменено');
    });

    await test.step('Хост: бронирование переместилось в "Отменённые"', async () => {
      const hostBooking = new BookingPage(hostPage);
      await hostBooking.page.goto('/pomidorqa/bookings');

      const hostCanceledCard = hostBooking.getBookingCardById(bookingId, 'canceled');
      await expect(hostCanceledCard).toBeVisible({ timeout: 10_000 });
      await expect(hostCanceledCard.locator('p').first()).toHaveText(guest.name);

      const statusText = await hostCanceledCard.locator('p').nth(1).textContent();
      expect(statusText).toContain('отменено');
    });
  });
});
