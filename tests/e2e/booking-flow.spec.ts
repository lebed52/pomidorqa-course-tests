import { test } from '@playwright/test';
import { makeUser, registerUser } from '../helpers/user';
import { ProfilePage } from '../pages/ProfilePage';
import { BookingPage } from '../pages/BookingPage';

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

  // Хост
  await test.step('Хост: регистрация + навык + слот', async () => {
    await registerUser(hostPage, host);
    await hostPage.goto('/pomidorqa/profile');
    await hostProfile.addSkill(skillTag, 'can_help');

    await hostPage.goto('/pomidorqa/profile/slots');
    const tomorrow = new Date(Date.now() + 24 * 60 * 60 * 1000);
    const date = tomorrow.toISOString().slice(0, 10);
    await hostProfile.addSlot(date, '12:00');
    await hostProfile.expectSlotVisible();
  });

  // Гость
  await test.step('Гость: регистрация → поиск → бронирование', async () => {
    await registerUser(guestPage, guest);
    await guestBooking.searchBySkill(skillTag);
    await guestBooking.openHostCard(host.name);
    await guestBooking.expectPersonName(host.name);
    await guestBooking.selectFirstSlot();
    await guestBooking.expectDialogVisible();
    await guestBooking.confirmBooking();
  });

  // Гость2
  await test.step('Гость2: регистрация → поиск → попытка бронирования (ошибка)', async () => {
    await registerUser(guest2Page, guest2);
    await guest2Booking.searchBySkill(skillTag);
    await guest2Booking.openHostCard(host.name);
    await guest2Booking.expectPersonName(host.name);
    await guest2Booking.selectFirstSlot();
    await guest2Booking.expectDialogVisible();
    await guest2Booking.confirmBookingExpectError();
  });

  // Проверки
  await test.step('Гость видит бронирование в "Мои встречи"', async () => {
    await guestBooking.expectBookingCardHasName(host.name);
  });

  await test.step('Хост видит бронирование в "Мои встречи"', async () => {
    const hostBooking = new BookingPage(hostPage);
    await hostBooking.expectBookingCardHasName(guest.name);
  });

  await hostCtx.close();
  await guestCtx.close();
  await guest2Ctx.close();
});
