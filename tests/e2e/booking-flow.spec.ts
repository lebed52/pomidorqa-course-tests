import { test, expect } from "@playwright/test";
import { dateInDays, ROUTES, UserPool, uniqueTag } from "../helpers/user";
import { ProfilePage } from "../pages/profile-page";
import { SlotsPage } from "../pages/slots-page";
import { BookingPage } from "../pages/booking-page";

test.describe("Бронирование: гонка за один слот", () => {
  const users = new UserPool();

  test.afterEach(async () => {
    await users.cleanup();
  });

  test("занятый слот достаётся первому, второй получает ошибку", async ({ browser }) => {
    // В CI сценарий идёт 17.5 с, но openFirstSlot вызывается дважды, а внутри
    // него цикл против гонки гидратации с дедлайном 15 с. Легальный худший
    // случай — 17.5 + 30 = 47 с, за стандартные 30 из конфига он не влезает.
    // Зависание при этом ловят таймауты самих шагов: 5 с на клик, 3 с на
    // диалог, 15 с на проверки, — до общего лимита дело не доходит.
    test.setTimeout(60_000);

    const runId = Date.now();
    const skillTag = uniqueTag("Playwright-demo", runId);

    const [host, guest, guest2] =
      await test.step("Заводим через API хоста на его профиле и двух гостей в каталоге", async () => [
        await users.add(browser, "host", runId, ROUTES.profile),
        await users.add(browser, "guest", runId, ROUTES.home),
        await users.add(browser, "guest2", runId, ROUTES.home),
      ]);

    const hostProfile = new ProfilePage(host.page);
    const hostSlots = new SlotsPage(host.page);
    const guestBooking = new BookingPage(guest.page);
    const guest2Booking = new BookingPage(guest2.page);
    const hostBooking = new BookingPage(host.page);

    await test.step("Хост добавляет навык «могу помочь»", async () => {
      await hostProfile.addSkill(skillTag, "can_help");
    });

    await test.step("Навык появился в блоке «могу помочь»", async () => {
      await expect(hostProfile.canHelpSkills).toContainText(skillTag);
    });

    await test.step("Хост добавляет свободный слот на завтра", async () => {
      await hostSlots.open();
      await hostSlots.addSlot(dateInDays(1), "12:00");
    });

    await test.step("Слот появился в списке хоста", async () => {
      await expect(hostSlots.slotCards.first()).toBeVisible();
    });

    await test.step("Гость ищет хоста в каталоге по навыку", async () => {
      await guestBooking.searchBySkill(skillTag);
    });

    await test.step("Хост нашёлся в результатах поиска", async () => {
      await expect(guestBooking.personCard(host.user.name)).toBeVisible();
    });

    await test.step("Гость открывает карточку хоста и окно бронирования", async () => {
      await guestBooking.openPersonCard(host.user.name);
      await guestBooking.openFirstSlot();
    });

    await test.step("Гость видит окно брони на странице хоста", async () => {
      await expect(guestBooking.personName).toHaveText(host.user.name);
      await expect(guestBooking.confirmDialog).toBeVisible();
    });

    await test.step("Второй гость открывает то же окно, пока слот ещё свободен", async () => {
      await guest2Booking.searchBySkill(skillTag);
      await guest2Booking.openPersonCard(host.user.name);
      await guest2Booking.openFirstSlot();
    });

    await test.step("Второй гость видит окно брони на том же слоте", async () => {
      await expect(guest2Booking.personName).toHaveText(host.user.name);
      await expect(guest2Booking.confirmDialog).toBeVisible();
    });

    await test.step("Гость подтверждает бронь первым", async () => {
      await guestBooking.confirmBooking();
    });

    await test.step("Бронирование прошло", async () => {
      await expect(guestBooking.confirmSuccess).toBeVisible({
        timeout: 15_000,
      });
    });

    await test.step("Второй гость подтверждает тот же слот", async () => {
      await guest2Booking.confirmBooking();
    });

    await test.step("Второй гость видит ошибку, брони у него нет", async () => {
      await expect(guest2Booking.confirmError).toBeVisible({
        timeout: 15_000,
      });
      await expect(guest2Booking.confirmSuccess).toBeHidden();
    });

    await test.step("Гость открывает «Мои встречи»", async () => {
      await guestBooking.openMyMeetings();
    });

    await test.step("Гость видит встречу с хостом", async () => {
      await expect(guestBooking.firstMeetingName()).toHaveText(host.user.name, {
        timeout: 10_000,
      });
    });

    await test.step("Хост открывает «Мои встречи»", async () => {
      await hostBooking.openMyMeetings();
    });

    await test.step("Хост видит ту же встречу с гостем", async () => {
      await expect(hostBooking.firstMeetingName()).toHaveText(guest.user.name, {
        timeout: 10_000,
      });
    });
  });
});
