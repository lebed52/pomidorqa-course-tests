import { test, expect } from '@playwright/test';
import { makeUser } from './helpers/user';
import { RegistrPage } from './pages/registr';
import { ProfilePage } from './pages/profile';
import { CatalogPage } from './pages/catalog';
import { BookingPage } from './pages/booking';
import { SlotsPage } from './pages/slots';

test('основной путь + гонка за слот: регистрация → навык → слот → поиск в каталоге → бронирование → «Мои встречи» у обоих → второй гость видит ошибку', async ({
  browser,
}) => {
  const runId = Date.now();
  const skillTag = `Playwright-demo-${runId}`;
  const host = makeUser('host', runId);
  const guest = makeUser('guest', runId);
  const guest2 = makeUser('guest2', runId);

  const hostContext = await browser.newContext();
  const guestContext = await browser.newContext();
  const guest2Context = await browser.newContext();
  const hostPage = await hostContext.newPage();
  const guestPage = await guestContext.newPage();
  const guest2Page = await guest2Context.newPage();

  const hostRegistr = new RegistrPage(hostPage);
  const guestRegistr = new RegistrPage(guestPage);
  const guest2Registr = new RegistrPage(guest2Page);
  const hostProfile = new ProfilePage(hostPage);
  const hostSlots = new SlotsPage(hostPage);
  const guestCatalog = new CatalogPage(guestPage);
  const guest2Catalog = new CatalogPage(guest2Page);
  const guestBooking = new BookingPage(guestPage);
  const guest2Booking = new BookingPage(guest2Page);
  const hostBookings = new BookingPage(hostPage); // только для upcomingSession («Мои встречи»)

  await test.step('Хост: регистрируется в PomidorQA', async () => {
    await hostRegistr.register(host);
  });

  await test.step('Хост: добавляет навык «могу помочь» в профиле', async () => {
    await hostProfile.open();
    await hostProfile.addSkill(skillTag);
    await expect(hostProfile.canHelpSkills).toContainText(skillTag);
  });

  await test.step('Хост: добавляет свободный слот на завтра', async () => {
    await hostSlots.open();
    const tomorrow = new Date(Date.now() + 24 * 60 * 60 * 1000);
    const date = tomorrow.toISOString().slice(0, 10);
    await hostSlots.addSlot(date, '12:00');
    await expect(hostSlots.freeSlots).toBeVisible();
  });

  await test.step('Гость: регистрируется отдельным аккаунтом', async () => {
    await guestRegistr.register(guest);
  });

  await test.step('Гость: ищет хоста в каталоге по навыку (сценарий 9)', async () => {
    await guestCatalog.catalogFilterInput.fill(skillTag);
    await guestCatalog.btnSearch.click();
    await expect(guestCatalog.personCard.filter({ hasText: host.name })).toBeVisible();
  });

  await test.step('Гость: открывает карточку хоста', async () => {
    await guestCatalog.personCard.filter({ hasText: host.name }).click();
    await expect(guestCatalog.personName).toHaveText(host.name);
  });

  await test.step('Гость: кликает по дню и времени в календаре слотов', async () => {
    await expect(async () => {
      const dayChip = guestBooking.calendarDay.first();
      if (!(await dayChip.isVisible().catch(() => false))) {
        await guestPage.reload();
      }
      await expect(dayChip).toBeVisible();
    }).toPass({ timeout: 15_000 });

    await guestBooking.calendarDay.first().click();
    await guestBooking.calendarTime.first().click();
    await expect(guestBooking.confirmModalDialog).toBeVisible();
  });

  await test.step('Гость2: регистрируется и тоже открывает окно бронирования на тот же слот', async () => {
    await guest2Registr.register(guest2);

    await guest2Catalog.catalogFilterInput.fill(skillTag);
    await guest2Catalog.btnSearch.click();
    await guest2Catalog.personCard.filter({ hasText: host.name }).click();
    await expect(guest2Catalog.personName).toHaveText(host.name);

    await expect(async () => {
      const dayChip = guest2Booking.calendarDay.first();
      if (!(await dayChip.isVisible().catch(() => false))) {
        await guest2Page.reload();
      }
      await expect(dayChip).toBeVisible();
    }).toPass({ timeout: 15_000 });

    await guest2Booking.calendarDay.first().click();
    await guest2Booking.calendarTime.first().click();
    await expect(guest2Booking.confirmModalDialog).toBeVisible();
  });

  await test.step('Гость: подтверждает бронирование первым — успех', async () => {
    await guestBooking.modalDialogConfirm.click();
    const success = guestBooking.modalSuccess;
    const error = guestBooking.modalError;
    await expect(success.or(error)).toBeVisible({ timeout: 15_000 });
    if (await error.isVisible().catch(() => false)) {
      throw new Error(`Бронирование не удалось: ${await error.textContent()}`);
    }
  });

  await test.step('Гость2: пытается забронировать тот же слот вторым — видит ошибку', async () => {
    await guest2Booking.modalDialogConfirm.click();

    const success2 = guest2Booking.modalSuccess;
    const error2 = guest2Booking.modalError;
    await expect(success2.or(error2)).toBeVisible({ timeout: 15_000 });

    if (await success2.isVisible().catch(() => false)) {
      throw new Error('Слот должен был быть занят, но бронирование прошло успешно');
    }
    await expect(error2).toBeVisible();
  });

  await test.step('Гость: видит бронирование в разделе «Мои встречи»', async () => {
    await expect(async () => {
      await guestPage.goto('/pomidorqa/bookings');
      await expect(guestBooking.upcomingSession).toContainText(host.name);
    }).toPass({ timeout: 15_000 });
  });

  await test.step('Хост: тоже видит это бронирование в своих «Мои встречи»', async () => {
    await expect(async () => {
      await hostPage.goto('/pomidorqa/bookings');
      await expect(hostBookings.upcomingSession).toContainText(guest.name);
    }).toPass({ timeout: 15_000 });
  });

  await hostContext.close();
  await guestContext.close();
  await guest2Context.close();
});
