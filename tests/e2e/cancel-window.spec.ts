import { expect, test, type BrowserContext } from "@playwright/test";
import { slotFormValues } from "../helpers/slot-time";
import { cleanupUsersViaApi, makeUser, registerUserViaApi } from "../helpers/user";
import { BookingPage } from "../pages/booking-page";
import { ProfilePage } from "../pages/profile-page";

// Требования п.11 и критерий приёмки «нельзя отменить бронирование за час до звонка»:
// отмена разрешена не позже чем за 2 часа до начала. Слот берём на час вперёд —
// это внутри запретного окна, поэтому кнопка «Отменить» должна вернуть ошибку,
// а встреча — остаться подтверждённой (раньше здесь был KD-2).

let accountContexts: BrowserContext[] = [];

test.describe("Окно отмены бронирования", () => {
  test.afterEach(async () => {
    await cleanupUsersViaApi(accountContexts);
    accountContexts = [];
  });

  test("за час до начала встречу отменить нельзя", async ({ browser }, testInfo) => {
    const runId = Date.now();
    const host = makeUser("late-cancel-host", runId);
    const guest = makeUser("late-cancel-guest", runId);
    const skill = `LateCancel-${runId}`;
    const soon = slotFormValues(60 * 60 * 1000);
    const hostContext = await browser.newContext({ baseURL: testInfo.project.use.baseURL });
    const guestContext = await browser.newContext({ baseURL: testInfo.project.use.baseURL });
    accountContexts = [hostContext, guestContext];
    const hostPage = await hostContext.newPage();
    const hostProfile = new ProfilePage(hostPage);
    const hostSlots = new BookingPage(hostPage);
    const guestBooking = new BookingPage(await guestContext.newPage());

    await test.step("Хост открывает слот, до которого остался час", async () => {
      await registerUserViaApi(hostContext.request, host);
      await hostProfile.goto();
      await hostProfile.addSkill(skill, "can_help");
      await hostSlots.gotoSlots();
      await hostSlots.addSlot(soon.date, soon.time);
    });

    await test.step("Гость бронирует этот слот", async () => {
      await registerUserViaApi(guestContext.request, guest);
      await guestBooking.findPerson(skill, host.name);
      await guestBooking.openPerson(host.name);
      await guestBooking.selectFirstAvailableSlot();
      await guestBooking.confirmBooking();
      await expect(guestBooking.confirmSuccess).toBeVisible();
    });

    await test.step("Гость пробует отменить встречу", async () => {
      await expect(async () => {
        await guestBooking.gotoBookings();
        await expect(guestBooking.upcomingCard(host.name)).toBeVisible();
      }).toPass({ timeout: 15_000 });
      await guestBooking.submitCancel(host.name);
    });

    await test.step("Сервис объясняет отказ, встреча осталась подтверждённой", async () => {
      await expect(guestBooking.cancelError).toBeVisible();
      await expect(guestBooking.upcomingCard(host.name)).toBeVisible();
      await expect(guestBooking.pastCard(host.name)).toHaveCount(0);
    });

    await test.step("У хоста встреча тоже не отменилась", async () => {
      const hostBooking = new BookingPage(hostPage);
      await hostBooking.gotoBookings();
      await expect(hostBooking.upcomingCard(guest.name)).toBeVisible();
    });
  });
});
