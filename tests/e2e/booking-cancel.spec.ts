import { test, expect, type BrowserContext, type Page } from '@playwright/test';
import {
  deleteAccountViaApi,
  makeUnique,
  makeUser,
  registerViaApi,
  type TestUser,
} from '../helpers/user';
import { CatalogPage } from '../pages/catalog';
import { ProfilePage } from '../pages/profile';
import { SlotsPage } from '../pages/slots';
import { BookingPage } from '../pages/booking';

test.describe('Мои встречи: отмена брони', () => {
  let host: TestUser;
  let guest: TestUser;
  let skillTag: string;
  let hostContext: BrowserContext;
  let guestContext: BrowserContext;
  let hostPage: Page;
  let guestPage: Page;
  let hostProfile: ProfilePage;
  let hostSlots: SlotsPage;
  let hostBooking: BookingPage;
  let guestCatalog: CatalogPage;
  let guestBooking: BookingPage;

  test.beforeEach(async ({ browser }) => {
    hostContext = await browser.newContext();
    guestContext = await browser.newContext();
    hostPage = await hostContext.newPage();
    guestPage = await guestContext.newPage();

    host = makeUser('host');
    guest = makeUser('guest');
    skillTag = makeUnique('Cancel');

    // API-регистрация: контексты уже залогинены, форму не дёргаем
    await registerViaApi(hostContext, host);
    await registerViaApi(guestContext, guest);

    hostProfile = new ProfilePage(hostPage);
    hostSlots = new SlotsPage(hostPage);
    hostBooking = new BookingPage(hostPage);
    guestCatalog = new CatalogPage(guestPage);
    guestBooking = new BookingPage(guestPage);

    // Хост делает себя находимым: навык + свободный слот на завтра
    await hostProfile.open();
    await hostProfile.addSkill(skillTag);
    await expect(hostProfile.canHelpSkills).toContainText(skillTag);

    await hostSlots.open();
    const tomorrow = new Date(Date.now() + 24 * 60 * 60 * 1000);
    await hostSlots.addSlot(tomorrow.toISOString().slice(0, 10), '12:00');
    await expect(hostSlots.freeSlots).toBeVisible();

    // API-регистрация не открывает страницы — гостя явно привозим в каталог
    await guestCatalog.goto();
  });

  test.afterEach(async () => {
    // каскадный DELETE сносит аккаунты и их данные; контексты закрываем
    // после удаления — сессия из куки должна быть живой на момент запроса.
    // Уборка best-effort: если регистрация упала, удалять нечего.
    await deleteAccountViaApi(guestContext).catch(() => undefined);
    await deleteAccountViaApi(hostContext).catch(() => undefined);
    await guestContext.close();
    await hostContext.close();
  });

  test('отменённая встреча уходит в «Прошедшие и отменённые» — её видят гость и хост после перезагрузки', async () => {
    let guestResult: 'success' | 'taken';
    let cancelResult: 'cancelled' | 'not-found';

    await test.step('Гость: ищет хоста в каталоге по навыку', async () => {
      await guestCatalog.searchBy(skillTag);
    });

    await test.step('Карточка хоста найдена в каталоге', async () => {
      await expect(guestCatalog.getPersonCard(host.name)).toBeVisible();
    });

    await test.step('Гость: открывает карточку хоста', async () => {
      await guestCatalog.getPersonCard(host.name).click();
    });

    await test.step('Открыта карточка хоста', async () => {
      await expect(guestCatalog.personName).toHaveText(host.name);
    });

    await test.step('Гость: кликает по дню и времени в календаре слотов', async () => {
      await guestBooking.waitForFreeSlot();
      await guestBooking.selectFirstSlot();
    });

    await test.step('Гость: подтверждает бронирование', async () => {
      guestResult = await guestBooking.confirmBooking();
    });

    await test.step('Бронирование гостя подтверждено — слот достался ему', async () => {
      expect(guestResult).toBe('success');
    });

    await test.step('Гость: видит бронирование в разделе «Мои встречи»', async () => {
      await expect(async () => {
        await guestBooking.openBookings();
        await expect(guestBooking.upcomingSession).toContainText(host.name);
      }).toPass({ timeout: 15_000 });
    });

    await test.step('Гость: отменяет встречу с хостом', async () => {
      cancelResult = await guestBooking.cancelBookingWith(host.name);
    });

    await test.step('Встреча гостя отменена', async () => {
      expect(cancelResult).toBe('cancelled');
    });

    await test.step('После перезагрузки у гостя встреча в «Прошедшие и отменённые»', async () => {
      await guestPage.reload();
      await expect(guestBooking.upcomingBookingWith(host.name)).toHaveCount(0);
      await expect(guestBooking.cancelledSection).toBeVisible();
      await expect(guestBooking.pastBookingWith(host.name)).toContainText('отменено');
    });

    await test.step('После перезагрузки у хоста встреча в «Прошедшие и отменённые»', async () => {
      await expect(async () => {
        await hostBooking.openBookings();
        await hostPage.reload();
        await expect(hostBooking.upcomingBookingWith(guest.name)).toHaveCount(0);
        await expect(hostBooking.cancelledSection).toBeVisible();
        await expect(hostBooking.pastBookingWith(guest.name)).toContainText('отменено');
      }).toPass({ timeout: 15_000 });
    });
  });
});
