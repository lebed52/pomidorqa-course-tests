import { test, expect } from "@playwright/test";
import {
  dateInDays,
  makeUser,
  registerAllInNewContexts,
} from "../helpers/user";
import { ProfilePage } from "../pages/profile-page";
import { SlotsPage } from "../pages/slots-page";
import { BookingPage } from "../pages/booking-page";

test.describe("Бронирование: отмена встречи", () => {
  test("отменённую гостем встречу видят обе стороны", async ({ browser }) => {
    // В CI сценарий идёт 16.4 с, но внутри openFirstSlot сидит цикл против
    // гонки гидратации с дедлайном 15 с. Легальный худший случай — 16.4 + 15 =
    // 31 с, ровно за стандартными 30 из конфига. Зависание при этом ловят
    // таймауты самих шагов, а не общий лимит.
    test.setTimeout(60_000);

    const runId = Date.now();
    const skillTag = `Playwright-cancel-${runId}`;
    const host = makeUser("cancelhost", runId);
    const guest = makeUser("cancelguest", runId);

    const [hostPage, guestPage] =
      await test.step("Регистрируем хоста и гостя", () =>
        registerAllInNewContexts(browser, [host, guest]));

    try {
      const hostProfile = new ProfilePage(hostPage);
      const hostSlots = new SlotsPage(hostPage);
      const hostBooking = new BookingPage(hostPage);
      const guestBooking = new BookingPage(guestPage);

      await test.step("Хост добавляет навык «могу помочь»", async () => {
        await hostProfile.open();
        await hostProfile.addSkill(skillTag, "can_help");
      });

      await test.step("Навык появился в блоке «могу помочь»", async () => {
        await expect(hostProfile.canHelpSkills).toContainText(skillTag);
      });

      await test.step("Хост выкладывает свободный слот на завтра", async () => {
        await hostSlots.open();
        await hostSlots.addSlot(dateInDays(1), "12:00");
      });

      await test.step("Слот появился в списке хоста", async () => {
        await expect(hostSlots.slotCards).toHaveCount(1);
      });

      await test.step("Гость находит хоста по навыку и бронирует его слот", async () => {
        await guestBooking.searchBySkill(skillTag);
        await guestBooking.openPersonCard(host.name);
        await guestBooking.openFirstSlot();
        await guestBooking.confirmBooking();
      });

      await test.step("Бронирование подтвердилось", async () => {
        await expect(guestBooking.confirmSuccess).toBeVisible({
          timeout: 15_000,
        });
      });

      await test.step("Гость открывает «Мои встречи»", async () => {
        await guestBooking.openMyMeetings();
      });

      await test.step("Встреча с хостом видна в «Ближайших»", async () => {
        await expect(guestBooking.upcomingMeeting(host.name)).toBeVisible({
          timeout: 10_000,
        });
      });

      await test.step("Гость отменяет встречу", async () => {
        await guestBooking.cancelMeeting(host.name);
      });

      await test.step("Карточка ушла из «Ближайших» в «Прошедшие и отменённые»", async () => {
        // Сначала ждём положительный признак: пока страница не перерисовалась,
        // toHaveCount(0) прошёл бы мгновенно и по неправильной причине.
        await expect(guestBooking.pastMeeting(host.name)).toContainText(
          "отменено",
        );
        await expect(guestBooking.upcomingMeeting(host.name)).toHaveCount(0);
      });

      await test.step("Гость перезагружает страницу", async () => {
        await guestBooking.reload();
      });

      await test.step("После перезагрузки отмена никуда не делась", async () => {
        // Сначала ждём положительный признак: пока страница не перерисовалась,
        // toHaveCount(0) прошёл бы мгновенно и по неправильной причине.
        await expect(guestBooking.pastMeeting(host.name)).toContainText(
          "отменено",
        );
        await expect(guestBooking.upcomingMeeting(host.name)).toHaveCount(0);
      });

      await test.step("Хост открывает «Мои встречи»", async () => {
        await hostBooking.openMyMeetings();
      });

      await test.step("Хост видит отменённую встречу в «Прошедших»", async () => {
        await expect(hostBooking.pastMeeting(guest.name)).toBeVisible({
          timeout: 10_000,
        });
      });

      await test.step("Хост перезагружает страницу", async () => {
        await hostBooking.reload();
      });

      await test.step("После перезагрузки хост видит встречу отменённой, с именем гостя", async () => {
        await expect(hostBooking.pastMeeting(guest.name)).toContainText(
          "отменено",
        );
        await expect(hostBooking.upcomingMeeting(guest.name)).toHaveCount(0);
      });
    } finally {
      await hostPage.context().close();
      await guestPage.context().close();
    }
  });
});
