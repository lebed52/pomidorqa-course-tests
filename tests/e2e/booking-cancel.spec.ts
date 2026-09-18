import { expect, test, type Browser, type BrowserContext, type Page } from "@playwright/test";
import {
  cleanupUsersViaApi,
  makeUser,
  registerUserViaApi,
  type TestUser,
} from "../helpers/user";
import { BookingPage } from "../pages/booking-page";
import { ProfilePage } from "../pages/profile-page";

// Требования п.11: отменить бронирование может любой из двоих участников, после отмены
// бронирование становится cancelled, а слот снова free и доступен другому участнику.
// Отмену со стороны гостя проверяет booking-state.spec.ts — здесь сторона хоста
// и повторное бронирование освободившегося слота третьим участником.

let accountContexts: BrowserContext[] = [];
let host: TestUser;
let guest: TestUser;
let skill: string;
let hostBooking: BookingPage;
let guestBooking: BookingPage;

async function newParticipantPage(browser: Browser, baseURL: string | undefined): Promise<Page> {
  const context = await browser.newContext({ baseURL });
  accountContexts.push(context);
  return context.newPage();
}

test.describe("Отмена бронирования", () => {
  test.beforeEach(async ({ browser }, testInfo) => {
    const runId = Date.now();
    accountContexts = [];
    host = makeUser("cancel-host", runId);
    guest = makeUser("cancel-guest", runId);
    skill = `Cancel-${runId}`;
    const baseURL = testInfo.project.use.baseURL;
    const hostPage = await newParticipantPage(browser, baseURL);
    const guestPage = await newParticipantPage(browser, baseURL);
    const hostProfile = new ProfilePage(hostPage);
    hostBooking = new BookingPage(hostPage);
    guestBooking = new BookingPage(guestPage);

    await test.step("Хост создаёт навык и единственный свободный слот", async () => {
      await registerUserViaApi(hostPage.context().request, host);
      await hostProfile.goto();
      await hostProfile.addSkill(skill, "can_help");
      const tomorrow = new Date(Date.now() + 24 * 60 * 60 * 1000);
      await hostBooking.gotoSlots();
      await hostBooking.addSlot(tomorrow.toISOString().slice(0, 10), "18:00");
    });

    await test.step("Гость бронирует слот хоста", async () => {
      await registerUserViaApi(guestPage.context().request, guest);
      await guestBooking.findPerson(skill, host.name);
      await guestBooking.openPerson(host.name);
      await guestBooking.selectFirstAvailableSlot();
      await guestBooking.confirmBooking();
    });

    await test.step("Бронирование подтверждено", async () => {
      await expect(guestBooking.confirmSuccess).toBeVisible();
    });
  });

  test.afterEach(async () => {
    await cleanupUsersViaApi(accountContexts);
    accountContexts = [];
  });

  test("хост отменяет встречу — она уходит в отменённые у обоих участников", async () => {
    await test.step("Хост открывает «Мои встречи» и видит гостя среди ближайших", async () => {
      await expect(async () => {
        await hostBooking.gotoBookings();
        await expect(hostBooking.upcomingCard(guest.name)).toBeVisible();
      }).toPass({ timeout: 15_000 });
    });

    await test.step("Хост отменяет встречу", async () => {
      await hostBooking.cancelBooking(guest.name);
    });

    // Требования п.12: отменить бронирование можно только из списка «Ближайшие»,
    // поэтому у отменённой встречи кнопки отмены больше нет.
    await test.step("У хоста встреча числится отменённой и отменить её больше нельзя", async () => {
      await expect(hostBooking.upcomingCard(guest.name)).toHaveCount(0);
      await expect(hostBooking.pastCard(guest.name)).toContainText("отменено");
      await expect(
        hostBooking.pastCard(guest.name).getByRole("button", { name: "Отменить" })
      ).toHaveCount(0);
    });

    await test.step("Гость тоже видит отмену, а не ближайшую встречу", async () => {
      await expect(async () => {
        await guestBooking.gotoBookings();
        await expect(guestBooking.pastCard(host.name)).toContainText("отменено");
      }).toPass({ timeout: 15_000 });
      await expect(guestBooking.upcomingCard(host.name)).toHaveCount(0);
    });
  });

  test("после отмены слот снова свободен и его бронирует другой участник", async ({
    browser,
  }, testInfo) => {
    const nextGuest = makeUser("cancel-next-guest", Date.now());
    const nextGuestPage = await newParticipantPage(browser, testInfo.project.use.baseURL);
    const nextGuestBooking = new BookingPage(nextGuestPage);

    await test.step("Пока слот занят, третий участник не находит хоста в каталоге", async () => {
      await registerUserViaApi(nextGuestPage.context().request, nextGuest);
      await expect(async () => {
        await nextGuestBooking.gotoCatalog();
        await nextGuestBooking.searchBySkill(skill);
        await expect(nextGuestBooking.personCard(host.name)).toHaveCount(0);
      }).toPass({ timeout: 15_000 });
    });

    await test.step("Гость отменяет своё бронирование", async () => {
      await guestBooking.gotoBookings();
      await guestBooking.cancelBooking(host.name);
    });

    await test.step("Третий участник бронирует освободившийся слот", async () => {
      await nextGuestBooking.findPerson(skill, host.name);
      await nextGuestBooking.openPerson(host.name);
      await nextGuestBooking.selectFirstAvailableSlot();
      await nextGuestBooking.confirmBooking();
    });

    await test.step("Новое бронирование подтверждено и видно в «Мои встречи»", async () => {
      await expect(nextGuestBooking.confirmSuccess).toBeVisible();
      await expect(async () => {
        await nextGuestBooking.gotoBookings();
        await expect(nextGuestBooking.upcomingCard(host.name)).toBeVisible();
      }).toPass({ timeout: 15_000 });
    });
  });
});
