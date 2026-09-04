import { test, expect } from '@playwright/test';
import { makeUser, registerUser, reload } from '../helpers/user';
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
      await hostPage.goto('/pomidorqa/profile');
      await hostProfile.addSkill(skillTag, 'can_help');
      await expect(hostProfile.canHelpSkills).toContainText(skillTag);
    });

    await test.step('Хост: добавляет свободный слот на завтра', async () => {
      await hostPage.goto('/pomidorqa/profile/slots');
      const tomorrow = new Date(Date.now() + 24 * 60 * 60 * 1000);
      const date = tomorrow.toISOString().slice(0, 10);
      await hostProfile.addSlot(date, '12:00');

      await expect(hostProfile.slotCard.first()).toBeVisible();
    });

    // ===== Гость =====
    await test.step('Гость: регистрация', async () => {
      await registerUser(guestPage, guest);
    });

    await test.step('Гость: ищет хоста в каталоге по навыку', async () => {
      await guestBooking.searchBySkill(skillTag);
      await guestBooking.openHostCard(host.name);
      await expect(guestBooking.personName).toHaveText(host.name);
    });

    await test.step('Гость: выбирает слот и открывает модалку бронирования', async () => {
      await guestBooking.selectFirstSlot();
      await expect(guestBooking.confirmDialog).toBeVisible();
    });

    await test.step('Гость: подтверждает бронирование', async () => {
      await guestBooking.confirmBooking();
    });

    // ===== Гость2 =====
    await test.step('Гость2: регистрация', async () => {
      await registerUser(guest2Page, guest2);
    });

    await test.step('Гость2: ищет хоста в каталоге по навыку', async () => {
      await guest2Booking.searchBySkill(skillTag);

      await expect(guest2Booking.personCard.filter({ hasText: host.name })).toBeHidden();
    });

    // ===== Проверки =====
    await test.step('Гость видит бронирование в "Мои встречи"', async () => {
      await expect(async () => {
        await guestPage.goto('/pomidorqa/bookings');
        await expect(guestBooking.bookingCardName).toHaveText(host.name);
      }).toPass({ timeout: 10_000 });
    });

    await test.step('Хост видит бронирование в "Мои встречи"', async () => {
      const hostBooking = new BookingPage(hostPage);
      await expect(async () => {
        await hostPage.goto('/pomidorqa/bookings');
        await expect(hostBooking.bookingCardName).toHaveText(guest.name);
      }).toPass({ timeout: 10_000 });
    });

    await hostCtx.close();
    await guestCtx.close();
    await guest2Ctx.close();
  });
});
