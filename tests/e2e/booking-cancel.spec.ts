import { test, expect, type BrowserContext } from '@playwright/test';
import { makeUser, registerUser, addDate, cleanupUsersViaApi } from '../helpers/user';
import { BookingPage } from '../pages/BookingPage';
import { ProfilePage } from '../pages/ProfilePage';

test.describe('Отмена бронирования', () => {
  let hostContext: BrowserContext;
  let guestContext: BrowserContext;

  test.afterEach(async () => {
    await cleanupUsersViaApi([hostContext, guestContext]);
  });

  test('Отмена слота у хоста и гостя', async ({ browser }) => {
    const runId = Date.now();
    const skillTag = `Playwright-demo-${runId}`;
    const host = makeUser('host', runId);
    const guest = makeUser('guest', runId);

    hostContext = await browser.newContext();
    guestContext = await browser.newContext();

    const hostPage = await hostContext.newPage();
    const guestPage = await guestContext.newPage();

    const hostProfile = new ProfilePage(hostPage);
    const hostBooking = new BookingPage(hostPage);
    const guestBooking = new BookingPage(guestPage);

    let bookingId: string;

    await test.step('Регистрация пользователей через API', async () => {
      await registerUser(hostContext.request, host);
      await registerUser(guestContext.request, guest);
    });

    await test.step('Хост: добавляет навык "Могу помочь"', async () => {
      await hostProfile.goto();
      await hostProfile.addSkill(skillTag, 'can_help');
    });

    await test.step('Навык появился в блоке "Могу помочь"', async () => {
      await expect(hostProfile.canHelpSkills).toContainText(skillTag);
    });

    await test.step('Хост: добавляет свободный слот на завтра', async () => {
      const date = addDate();
      await hostProfile.goToSlots();
      await hostProfile.addSlot(date, '12:00');
    });

    await test.step('Слот появился в списке', async () => {
      await expect(hostProfile.slotCard.first()).toBeVisible();
    });

    await test.step('Гость: ищет хоста в каталоге по навыку', async () => {
      await guestBooking.openCatalog();
      await guestBooking.searchInCatalog(skillTag);
      await guestBooking.openPersonCard(host.name);
    });

    await test.step('Карточка хоста открыта', async () => {
      await expect(guestBooking.personName).toHaveText(host.name);
    });

    await test.step('Гость: выбирает слот и открывает модалку', async () => {
      await expect(async () => {
        await guestBooking.selectFirstSlot();
        await expect(guestBooking.confirmDialog).toBeVisible({ timeout: 5_000 });
      }).toPass({ timeout: 15_000 });
    });

    await test.step('Гость: подтверждает бронирование', async () => {
      await guestBooking.clickConfirm();
    });

    await test.step('Бронирование подтвердилось', async () => {
      await expect(guestBooking.confirmSuccess).toBeVisible({ timeout: 15_000 });
    });

    // ===== Проверка у гостя =====
    await test.step('Гость: открывает "Мои встречи"', async () => {
      await guestBooking.goToBookings();
    });

    await test.step('Гость видит карточку бронирования', async () => {
      const firstCard = guestBooking.getFirstUpcomingCard();
      await expect(firstCard).toBeVisible({ timeout: 10_000 });
    });

    await test.step('Получаем ID бронирования', async () => {
      bookingId = await guestBooking.getFirstUpcomingBookingId();
    });

    await test.step('Гость видит имя хоста в бронировании', async () => {
      const guestCardName = guestBooking.getUpcomingCardName(bookingId);
      await expect(guestCardName).toHaveText(host.name);
    });

    await test.step('Хост: открывает "Мои встречи"', async () => {
      await hostBooking.goToBookings();
    });

    await test.step('Хост видит карточку бронирования', async () => {
      const hostCard = hostBooking.getBookingCardById(bookingId, 'upcoming');
      await expect(hostCard).toBeVisible({ timeout: 10_000 });
    });

    await test.step('Хост видит имя гостя в бронировании', async () => {
      const hostCardName = hostBooking.getUpcomingCardName(bookingId);
      await expect(hostCardName).toHaveText(guest.name);
    });

    await test.step('Гость отменяет бронирование', async () => {
      await guestBooking.cancelBookingById(bookingId);
    });

    await test.step('Карточка исчезла из "Ближайших" у гостя', async () => {
      const upcomingCard = guestBooking.getBookingCardById(bookingId, 'upcoming');
      await expect(upcomingCard).toBeHidden({ timeout: 10_000 });
    });

    await test.step('Гость: карточка появилась в "Отменённых"', async () => {
      const canceledCard = guestBooking.getBookingCardById(bookingId, 'canceled');
      await expect(canceledCard).toBeVisible({ timeout: 10_000 });
    });

    await test.step('Гость: в отменённой карточке имя хоста', async () => {
      const canceledName = guestBooking.getCanceledCardName(bookingId);
      await expect(canceledName).toHaveText(host.name);
    });

    await test.step('Гость: в отменённой карточке статус "отменено"', async () => {
      const status = guestBooking.getCanceledCardStatus(bookingId);
      await expect(status).toContainText('отменено');
    });

    await test.step('Хост: открывает "Мои встречи"', async () => {
      await hostBooking.goToBookings();
    });

    await test.step('Хост видит отменённую карточку', async () => {
      const hostCanceledCard = hostBooking.getBookingCardById(bookingId, 'canceled');
      await expect(hostCanceledCard).toBeVisible({ timeout: 10_000 });
    });

    await test.step('Хост: в отменённой карточке имя гостя', async () => {
      const hostCanceledName = hostBooking.getCanceledCardName(bookingId);
      await expect(hostCanceledName).toHaveText(guest.name);
    });

    await test.step('Хост: в отменённой карточке статус "отменено"', async () => {
      const status = hostBooking.getCanceledCardStatus(bookingId);
      await expect(status).toContainText('отменено');
    });
  });
});
