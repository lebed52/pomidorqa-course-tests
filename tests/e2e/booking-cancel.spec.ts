import { test, expect } from "@playwright/test";
import { makeUser, registerUser } from "../helpers/user";
import { toDateInputValue } from "../helpers/date";
import { ProfilePage } from "../pages/profile-page";
import { SlotsPage } from "../pages/slots-page";
import { CatalogPage } from "../pages/catalog-page";
import { BookingPage } from "../pages/booking-page";
import { MyBookingsPage } from "../pages/mybookings-page";

test.describe("Отмена бронирования", () => {
  test("гость бронирует слот хоста, потом отменяет бронирование, отмена видна у обоих", async ({
    browser,
  }) => {
    const runId = Date.now();
    const skillTag = `Playwright-demo-${runId}`;
    const host = makeUser("host", runId);
    const guest = makeUser("guest", runId);

    const hostContext = await browser.newContext();
    const guestContext = await browser.newContext();
    try {
      const hostPage = await hostContext.newPage();
      const guestPage = await guestContext.newPage();
      const profilePage = new ProfilePage(hostPage);
      const slotsPage = new SlotsPage(hostPage);
      const guestCatalogPage = new CatalogPage(guestPage);
      const guestBookingPage = new BookingPage(guestPage);
      const guestMyBookingsPage = new MyBookingsPage(guestPage);
      const hostMyBookingsPage = new MyBookingsPage(hostPage);

      await test.step("Хост: регистрируется в PomidorQA", async () => {
        await registerUser(hostPage, host);
      });

      await test.step('Хост: добавляет навык «могу помочь» в профиле', async () => {
        await profilePage.goto();

        await profilePage.addSkill(skillTag, "can_help");

        await expect(profilePage.canHelpSkills).toContainText(skillTag);
      });

      await test.step("Хост: добавляет свободный слот на завтра", async () => {
        const tomorrow = new Date(Date.now() + 24 * 60 * 60 * 1000);
        const date = toDateInputValue(tomorrow);
        await slotsPage.goto();

        await slotsPage.addSlot(date, "12:00");

        await expect(slotsPage.slotCards.first()).toBeVisible();
      });

      await test.step("Гость: регистрируется отдельным аккаунтом", async () => {
        await registerUser(guestPage, guest);
      });

      await test.step("Гость: ищет хоста в каталоге по навыку (сценарий 9)", async () => {
        await guestCatalogPage.filterBySkill(skillTag);

        await expect(guestCatalogPage.personCard(host.name)).toBeVisible();
      });

      await test.step("Гость: открывает карточку хоста", async () => {
        await guestCatalogPage.openPersonCard(host.name);

        await expect(guestBookingPage.personName).toHaveText(host.name);
      });

      await test.step("Гость: кликает по дню и времени в календаре слотов", async () => {
        await guestBookingPage.waitForSlots();

        await guestBookingPage.pickFirstSlot();

        await expect(guestBookingPage.confirmDialog).toBeVisible();
      });

      await test.step("Гость: подтверждает бронирование", async () => {
        await guestBookingPage.confirmBooking();

        const success = guestBookingPage.confirmSuccess;
        const error = guestBookingPage.confirmError;
        await expect(success.or(error)).toBeVisible({ timeout: 15_000 });
        if (await error.isVisible().catch(() => false)) {
          throw new Error(`Бронирование не удалось: ${await error.textContent()}`);
        }
      });

      await test.step("Гость: видит бронирование в разделе «Мои встречи»", async () => {
        await expect(async () => {
          await guestMyBookingsPage.goto();
          const card = guestMyBookingsPage.upcomingCard(host.name);

          await expect(card).toBeVisible();
        }).toPass({ timeout: 10_000 });
      });

      await test.step("Гость: отменяет бронирование, карточка исчезает из ближайших встреч, появляется в прошедших и отменённых", async () => {
        await guestMyBookingsPage.cancelBooking(host.name);

        const upcoming = guestMyBookingsPage.upcomingCard(host.name);
        const canceled = guestMyBookingsPage.canceledCard(host.name);
        await expect(upcoming).toBeHidden();
        await expect(canceled).toContainText("отменено");
      });

      await test.step("Гость: после перезагрузки по-прежнему видит отмену", async () => {
        await guestPage.reload();

        const upcoming = guestMyBookingsPage.upcomingCard(host.name);
        const canceled = guestMyBookingsPage.canceledCard(host.name);
        await expect(upcoming).toBeHidden();
        await expect(canceled).toContainText("отменено");
      });

      await test.step("Хост: видит отмену в своих «Мои встречи»", async () => {
        await hostMyBookingsPage.goto();

        const card = hostMyBookingsPage.canceledCard(guest.name);
        await expect(card).toContainText("отменено");
      });

    } finally {
      await hostContext.close();
      await guestContext.close();
    }
  });
});
