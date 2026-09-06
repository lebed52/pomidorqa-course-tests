import { test, expect, type Page } from "@playwright/test";
import { makeUser, registerUser, ROUTES } from "../helpers/user";
import { BookingPage } from "../pages/booking-page";
import { ProfilePage } from "../pages/profile-page";

test.describe("Бронирование и отмена встречи", () => {
    test("{Хост добавляет слот -> Гость бронирует слот -> Гость отменяет встречу -> Карточка переходит в прошедшие", async ({

    browser,
    }) => {
        const runId = Date.now();
        const skillTag = `Playwright-demo-${runId}`;
        const host = makeUser("host", runId);
        const guest = makeUser("guest", runId);

        // Три независимых аккаунта = три независимых браузерных контекста
        const hostContext = await browser.newContext();
        const guestContext = await browser.newContext();
        const hostPage = await hostContext.newPage();
        const guestPage = await guestContext.newPage();

        // экземпляры страниц
        const hostProfilePage = new ProfilePage(hostPage);

        const hostBookingPage = new BookingPage(hostPage);
        const guestBookingPage = new BookingPage(guestPage);

  await test.step("Хост: регистрируется в PomidorQA", async () => {
    await registerUser(hostPage, host);
  });
 
  await test.step('Хост: добавляет навык «могу помочь» в профиле', async () => {
      await hostProfilePage.goto();
      await hostProfilePage.addSkill(skillTag, 'can_help');
  });

  await test.step('Навык «могу помочь» отображается', async () => {
      await expect(hostProfilePage.canHelpSkills).toContainText(skillTag);
    });

  await test.step('Хост: добавляет свободный слот на завтра', async () => {

      const tomorrow = new Date(Date.now() + 24 * 60 * 60 * 1000);
      const date = tomorrow.toISOString().slice(0, 10);

      await hostBookingPage.addSlot(date, '12:00');
    });

  await test.step('Добавленный слот отображается', async () => {
      await expect(hostBookingPage.slotsCard.first()).toBeVisible();
    });

  await test.step("Гость: регистрируется отдельным аккаунтом", async () => {
    await registerUser(guestPage, guest);
  });

  await test.step('Гость: ищет хоста в каталоге по навыку (сценарий 9)', async () => {
      await guestBookingPage.searchBySkill(skillTag);
    });

  await test.step('У навыка указано имя владельца - хост', async () => {
      await expect(
      guestBookingPage.catalogCard.filter({ hasText: host.name })).toBeVisible();
  });

  await test.step('Гость: открывает карточку хоста', async () => {
      await guestBookingPage.openHostCard(host.name);
    });

    await test.step('В карточке отображается имя хоста', async () => {
      await expect(guestBookingPage.personName).toHaveText(host.name);
    });

  await test.step('Гость: кликает по дню и времени в календаре слотов', async () => {
      await guestBookingPage.waitForFirstAvailableDay();
      await guestBookingPage.selectFirstAvailableSlot();
    });

    await test.step('Диалог подтверждения отображается', async () => {
      await expect(guestBookingPage.bookingConfirmDialog).toBeVisible();
    });

     await test.step('Гость нажимает кнопку подтверждения бронирования', async () => {
      await guestBookingPage.bookingConfirmButton.click();
    });

    await test.step('Бронирование успешно', async () => {
      const success = guestBookingPage.bookingConfirmSuccess;
      const error = guestBookingPage.bookingConfirmError;

      await expect(success.or(error)).toBeVisible({ timeout: 15_000 });

      if (await error.isVisible().catch(() => false)) {
        throw new Error(`Бронирование не удалось: ${await error.textContent()}`);
      }
    });

    await test.step('Гость: отменяет бронирование', async () => {
      await guestBookingPage.bookingCancelButton.click();
    });

    await test.step('Бронирование отменено', async () => {
      await expect(guestBookingPage.bookingsUpcomingSection).toContainText("Пока пусто");
      await expect(guestBookingPage.bookingsPastSection).toHaveText(host.name);
    });
    });
});