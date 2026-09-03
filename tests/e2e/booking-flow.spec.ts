import { test, expect } from '@playwright/test';
import { ProfilePage } from '../pages/profile-page';
import { makeUser, registerUser } from '../helpers/user';
import { BookingPage } from '../pages/booking-page';
import { SlotsPage } from '../pages/slots-page';

test.describe('Профиль: создание и бронирование слота', () => {
  test('основной путь + гонка за слот: регистрация → навык → слот → поиск в каталоге → бронирование → «Мои встречи» у обоих → второй гость видит ошибку', async ({
    browser,
  }) => {
    // Arrange: три независимых актора — свои контексты, свои страницы, свои PO
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

    const hostProfile = new ProfilePage(hostPage);
    const hostSlots = new SlotsPage(hostPage);
    const hostBooking = new BookingPage(hostPage);

    const guestBooking = new BookingPage(guestPage);
    const guest2Booking = new BookingPage(guest2Page);

    await test.step('Хост: регистрируется в PomidorQA', async () => {
      await registerUser(hostPage, host);
    });

    await test.step('Хост: добавляет навык «могу помочь» в профиле', async () => {
      await hostProfile.goto();
      await hostProfile.profileSkillInput.fill(skillTag);
      await hostProfile.profileSkillTypeSelect.selectOption('can_help');
      await hostProfile.profileSkillSubmit.click();
      await expect(hostProfile.canHelpSkills).toContainText(skillTag);
    });

    await test.step('Хост: добавляет свободный слот на завтра', async () => {
      await hostPage.goto('/pomidorqa/profile/slots');
      const tomorrow = new Date(Date.now() + 24 * 60 * 60 * 1000);
      const date = tomorrow.toISOString().slice(0, 10);
      await hostSlots.slotsDateInput.fill(date);
      await hostSlots.slotsTimeInput.fill('12:00');
      await hostSlots.slotsAddSubmit.click();
      await expect(hostSlots.slotsCard.first()).toBeVisible();
    });

    await test.step('Гость: регистрируется отдельным аккаунтом', async () => {
      await registerUser(guestPage, guest);
    });

    await test.step('Гость: ищет хоста в каталоге по навыку (сценарий 9)', async () => {
      await guestBooking.catalogFilterInput.fill(skillTag);
      await guestBooking.catalogFilterSubmit.click();
      await expect(guestBooking.catalogCard.filter({ hasText: host.name })).toBeVisible();
    });

    await test.step('Гость: открывает карточку хоста', async () => {
      await guestBooking.catalogCard.filter({ hasText: host.name }).click();
      await expect(guestBooking.personName).toHaveText(host.name);
    });

    await test.step('Гость: кликает по дню и времени в календаре слотов', async () => {
      await expect(async () => {
        const dayChip = guestBooking.bookingCalendarDay.first();
        if (!(await dayChip.isVisible().catch(() => false))) {
          await guestPage.reload();
        }
        await expect(dayChip).toBeVisible();
      }).toPass({ timeout: 10_000 });

      await guestBooking.bookingCalendarDay.first().click();
      await guestBooking.bookingCalendarTime.first().click();
      await expect(guestBooking.bookingConfirmDialog).toBeVisible();
    });

    // Важно для разбора ДЗ 4: модалку guest2 открываем ДО confirm у guest.
    // Пока слот в UI ещё свободен — оба «человек открыл и отошёл».
    await test.step('Гость2: регистрируется и тоже открывает окно бронирования на тот же слот', async () => {
      await registerUser(guest2Page, guest2);

      await guest2Booking.catalogFilterInput.fill(skillTag);
      await guest2Booking.catalogFilterSubmit.click();
      await guest2Booking.catalogCard.filter({ hasText: host.name }).click();
      await expect(guest2Booking.personName).toHaveText(host.name);

      await expect(async () => {
        const dayChip = guest2Booking.bookingCalendarDay.first();
        if (!(await dayChip.isVisible().catch(() => false))) {
          await guest2Page.reload();
        }
        await expect(dayChip).toBeVisible();
      }).toPass({ timeout: 10_000 });

      await guest2Booking.bookingCalendarDay.first().click();
      await guest2Booking.bookingCalendarTime.first().click();
      await expect(guest2Booking.bookingConfirmDialog).toBeVisible();
    });

    await test.step('Гость: подтверждает бронирование первым — успех', async () => {
      await guestBooking.bookingConfirmButton.click();
      const success = guestBooking.bookingConfirmSuccess;
      const error = guestBooking.bookingConfirmError;
      await expect(success.or(error)).toBeVisible({ timeout: 15_000 });
      if (await error.isVisible().catch(() => false)) {
        throw new Error(`Бронирование не удалось: ${await error.textContent()}`);
      }
    });

    await test.step('Гость2: пытается забронировать тот же слот вторым — видит ошибку', async () => {
      await guest2Booking.bookingConfirmButton.click();

      const success2 = guest2Booking.bookingConfirmSuccess;
      const error2 = guest2Booking.bookingConfirmError;
      await expect(success2.or(error2)).toBeVisible({ timeout: 15_000 });

      // Полярность наоборот относительно гостя 1: ошибка — ожидаемый результат
      if (await success2.isVisible().catch(() => false)) {
        throw new Error('Слот должен был быть занят, но бронирование прошло успешно');
      }
      await expect(error2).toBeVisible();
    });

    await test.step('Гость: видит бронирование в разделе «Мои встречи»', async () => {
      await expect(async () => {
        await guestPage.goto('/pomidorqa/bookings');
        const card = guestBooking.bookingsCardName;
        await expect(card).toHaveText(host.name);
      }).toPass({ timeout: 10_000 });
    });

    await test.step('Хост: тоже видит это бронирование в своих «Мои встречи»', async () => {
      await expect(async () => {
        await hostPage.goto('/pomidorqa/bookings');
        const card = hostBooking.bookingsCardName;
        await expect(card).toHaveText(guest.name);
      }).toPass({ timeout: 10_000 });
    });

    await hostContext.close();
    await guestContext.close();
    await guest2Context.close();
  });
});
