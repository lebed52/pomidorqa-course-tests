import { test, expect } from '@playwright/test';
import { makeUser, registerUser } from '../helpers/user';
import { BookingPage } from '../pages/BookingPage';
import { ProfilePage } from '../pages/ProfilePage';

test.describe('Бронирование, гонка за слот', () => {
  test('основной путь + гонка за слот', async ({ browser }) => {
    const runId = Date.now();
    const skillTag = `Playwright-demo-${runId}`;
    const host = makeUser('host', runId);
    const guest = makeUser('guest', runId);
    const guest2 = makeUser('guest2', runId);

    const hostCtx = await browser.newContext();
    const guestCtx = await browser.newContext();
    const guest2Ctx = await browser.newContext();

    const hostPage = await hostCtx.newPage();
    const guestPage = await guestCtx.newPage();
    const guest2Page = await guest2Ctx.newPage();

    const hostProfile = new ProfilePage(hostPage);
    const guestBooking = new BookingPage(guestPage);
    const guest2Booking = new BookingPage(guest2Page);

    // ===== Хост =====
    await test.step('Хост: регистрация', async () => {
      await registerUser(hostPage, host);
    });

    await test.step('Хост: добавляет навык "Могу помочь"', async () => {
      await hostProfile.goto();
      await hostProfile.addSkill(skillTag, 'can_help');
      await expect(hostProfile.canHelpSkills).toContainText(skillTag);
    });

    await test.step('Хост: добавляет свободный слот на завтра', async () => {
      await hostProfile.goToSlots();
      const tomorrow = new Date(Date.now() + 24 * 60 * 60 * 1000);
      const date = tomorrow.toISOString().slice(0, 10);
      await hostProfile.addSlot(date, '12:00');
      await expect(hostProfile.slotCard.first()).toBeVisible();
    });

    // ===== Гость: открывает модалку (НЕ подтверждает!) =====
    await test.step('Гость: регистрация', async () => {
      await registerUser(guestPage, guest);
    });

    await test.step('Гость: ищет хоста в каталоге по навыку', async () => {
      await guestBooking.searchBySkill(skillTag);
      await guestBooking.openHostCard(host.name);
      await expect(guestBooking.personName).toHaveText(host.name);
    });

    await test.step('Гость: выбирает слот и открывает модалку бронирования', async () => {
      await expect(async () => {
        await guestBooking.selectFirstSlot();
        await expect(guestBooking.confirmDialog).toBeVisible();
      }).toPass({ timeout: 15_000 });
    });

    // ===== Гость2: открывает ТУ ЖЕ модалку (пока слот свободен) =====
    await test.step('Гость2: регистрация', async () => {
      await registerUser(guest2Page, guest2);
    });

    await test.step('Гость2: ищет хоста в каталоге по навыку', async () => {
      await guest2Booking.searchBySkill(skillTag);
      await guest2Booking.openHostCard(host.name);
      await expect(guest2Booking.personName).toHaveText(host.name);
    });

    await test.step('Гость2: выбирает тот же слот и открывает модалку', async () => {
      await guest2Booking.selectFirstSlot();
      await expect(guest2Booking.confirmDialog).toBeVisible();
    });

    // ===== Гость: подтверждает бронирование ПЕРВЫМ =====
    await test.step('Гость: подтверждает бронирование', async () => {
      await guestBooking.clickConfirm();
      await expect(guestBooking.confirmSuccess).toBeVisible({ timeout: 15_000 });
    });

    // ===== Гость2: пытается подтвердить — видит ошибку =====
    await test.step('Гость2: пытается забронировать занятый слот — видит ошибку', async () => {
      await guest2Booking.clickConfirm();
      await expect(guest2Booking.confirmError).toBeVisible({ timeout: 15_000 });
      await expect(guest2Booking.confirmSuccess).toBeHidden();
    });

    // ===== Проверки =====
    await test.step('Гость видит бронирование в "Мои встречи"', async () => {
      await expect(async () => {
        await guestBooking.goToBookings();
        await expect(guestBooking.bookingCardName).toHaveText(host.name);
      }).toPass({ timeout: 10_000 });
    });

    await test.step('Хост видит бронирование в "Мои встречи"', async () => {
      const hostBooking = new BookingPage(hostPage);
      await expect(async () => {
        await hostBooking.goToBookings();
        await expect(hostBooking.bookingCardName).toHaveText(guest.name);
      }).toPass({ timeout: 10_000 });
    });

    await hostCtx.close();
    await guestCtx.close();
    await guest2Ctx.close();
  });
});
