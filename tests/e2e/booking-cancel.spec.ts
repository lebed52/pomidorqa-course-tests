import { test, expect } from '@playwright/test';
import { registerUser } from '../helpers/user';
import { bookingMeet } from '../helpers/bookingMeet';

test.describe('Мои встречи: отмена брони', () => {
  test('отменённая встреча уходит в «Прошедшие и отменённые» — её видят гость и хост после перезагрузки', async ({
    browser,
  }) => {
    const {
      host,
      guest,
      skillTag,
      hostContext,
      guestContext,
      hostPage,
      guestPage,
      hostProfile,
      hostSlots,
      hostBooking,
      guestCatalog,
      guestBooking,
    } = await bookingMeet(browser);

    let guestResult: 'success' | 'taken';
    let cancelResult: 'cancelled' | 'not-found';

    await test.step('Хост: регистрируется в PomidorQA', async () => {
      await registerUser(hostPage, host);
    });

    await test.step('Хост: добавляет навык «могу помочь» в профиле', async () => {
      await hostProfile.open();
      await hostProfile.addSkill(skillTag);
    });

    await test.step('Навык появился в блоке «Могу помочь»', async () => {
      await expect(hostProfile.canHelpSkills).toContainText(skillTag);
    });

    await test.step('Хост: добавляет свободный слот на завтра', async () => {
      await hostSlots.open();
      const tomorrow = new Date(Date.now() + 24 * 60 * 60 * 1000);
      const date = tomorrow.toISOString().slice(0, 10);
      await hostSlots.addSlot(date, '12:00');
    });

    await test.step('Слот отображается в списке', async () => {
      await expect(hostSlots.freeSlots).toBeVisible();
    });

    await test.step('Гость: регистрируется отдельным аккаунтом', async () => {
      await registerUser(guestPage, guest);
    });

    await test.step('Гость: ищет хоста в каталоге по навыку', async () => {
      await guestCatalog.catalogFilterInput.fill(skillTag);
      await guestCatalog.btnSearch.click();
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

    await test.step('Гость: отменяет встречу', async () => {
      cancelResult = await guestBooking.cancelFirstBooking();
    });

    await test.step('Встреча гостя отменена', async () => {
      expect(cancelResult).toBe('cancelled');
    });

    await test.step('После перезагрузки у гостя встреча в «Прошедшие и отменённые»', async () => {
      await guestPage.reload();
      await expect(guestBooking.upcomingSession).not.toContainText(host.name);
      await expect(guestBooking.cancelledSection).toBeVisible();
      await expect(guestBooking.cancelledStatus).toBeVisible();
    });

    await test.step('После перезагрузки у хоста встреча в «Прошедшие и отменённые»', async () => {
      await expect(async () => {
        await hostBooking.openBookings();
        await hostPage.reload();
        await expect(hostBooking.upcomingSession).not.toContainText(guest.name);
        await expect(hostBooking.cancelledSection).toBeVisible();
        await expect(hostBooking.cancelledStatus).toBeVisible();
      }).toPass({ timeout: 15_000 });
    });

    await hostContext.close();
    await guestContext.close();
  });
});
