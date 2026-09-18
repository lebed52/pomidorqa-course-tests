import { expect, test, type BrowserContext, type Page } from "@playwright/test";
import {
  cleanupUsersViaApi,
  makeUser,
  registerUserViaApi,
  type TestUser,
} from "../helpers/user";
import { BookingPage } from "../pages/booking-page";
import { ProfilePage } from "../pages/profile-page";

let accountContexts: BrowserContext[] = [];
let host: TestUser;
let guest: TestUser;
let skill: string;
let hostPage: Page;
let guestPage: Page;
let hostBooking: BookingPage;
let guestBooking: BookingPage;

test.describe("Бронирование: изменение состояния встречи и слота", () => {
  test.beforeEach(async ({ browser }, testInfo) => {
    const runId = Date.now();
    host = makeUser("booking-state-host", runId);
    guest = makeUser("booking-state-guest", runId);
    skill = `BookingState-${runId}`;
    const hostContext = await browser.newContext({ baseURL: testInfo.project.use.baseURL });
    const guestContext = await browser.newContext({ baseURL: testInfo.project.use.baseURL });
    accountContexts = [hostContext, guestContext];
    hostPage = await hostContext.newPage();
    guestPage = await guestContext.newPage();
    hostBooking = new BookingPage(hostPage);
    guestBooking = new BookingPage(guestPage);
    const hostProfile = new ProfilePage(hostPage);

    await test.step("Создаём хоста и гостя", async () => {
      await registerUserViaApi(hostContext.request, host);
      await registerUserViaApi(guestContext.request, guest);
    });

    await test.step("Хост добавляет навык и единственный свободный слот", async () => {
      await hostProfile.goto();
      await hostProfile.addSkill(skill, "can_help");
      await expect(hostProfile.canHelpSkills).toContainText(skill);
      const tomorrow = new Date(Date.now() + 24 * 60 * 60 * 1000);
      await hostBooking.gotoSlots();
      await hostBooking.addSlot(tomorrow.toISOString().slice(0, 10), "16:00");
      await expect(hostBooking.slotsCard).toHaveCount(1);
    });

    await test.step("Гость находит хоста и открывает подтверждение бронирования", async () => {
      await guestBooking.findPerson(skill, host.name);
      await guestBooking.openPerson(host.name);
      await guestBooking.selectFirstAvailableSlot();
    });

    await test.step("Окно подтверждения открыто", async () => {
      await expect(guestBooking.confirmDialog).toBeVisible();
    });
  });

  test.afterEach(async () => {
    await cleanupUsersViaApi(accountContexts);
    accountContexts = [];
  });

  test("последний забронированный слот исчезает со страницы специалиста и из каталога", async () => {
    await test.step("Гость подтверждает бронирование", async () => {
      await guestBooking.confirmBooking();
    });

    await test.step("Интерфейс сообщает об успешном бронировании", async () => {
      await expect(guestBooking.confirmSuccess).toBeVisible();
    });

    await test.step("После обновления у специалиста больше нет доступных дней", async () => {
      await guestPage.reload();
      await expect(guestBooking.calendarDay).toHaveCount(0);
    });

    await test.step("Специалист без свободных слотов исчезает из каталога", async () => {
      await expect(async () => {
        await guestBooking.gotoCatalog();
        await guestBooking.searchBySkill(skill);
        await expect(guestBooking.personCard(host.name)).toHaveCount(0);
      }).toPass({ timeout: 15_000 });
    });
  });

  test("отмена переносит встречу в отменённые у гостя и хоста", async () => {
    await test.step("Гость подтверждает бронирование", async () => {
      await guestBooking.confirmBooking();
    });

    await test.step("Встреча появляется у гостя среди ближайших", async () => {
      await expect(async () => {
        await guestBooking.gotoBookings();
        await expect(guestBooking.upcomingCard(host.name)).toBeVisible();
      }).toPass({ timeout: 15_000 });
    });

    await test.step("Гость отменяет встречу", async () => {
      await guestBooking.cancelBooking(host.name);
    });

    await test.step("Гость видит встречу среди отменённых", async () => {
      await expect(guestBooking.upcomingCard(host.name)).toHaveCount(0);
      await expect(guestBooking.pastCard(host.name)).toContainText("отменено");
    });

    await test.step("Хост также видит отменённую встречу", async () => {
      await expect(async () => {
        await hostBooking.gotoBookings();
        await expect(hostBooking.pastCard(guest.name)).toContainText("отменено");
      }).toPass({ timeout: 15_000 });
    });
  });

  test("закрытие подтверждения не создаёт встречу и сохраняет слот свободным", async () => {
    await test.step("Гость закрывает окно без подтверждения", async () => {
      await guestBooking.dismissBooking();
    });

    await test.step("Окно закрыто, а выбранное время остаётся доступным", async () => {
      await expect(guestBooking.confirmDialog).not.toBeVisible();
      await expect(guestBooking.calendarTime.first()).toBeVisible();
    });

    await test.step("Встреча не появляется в списке гостя", async () => {
      await guestBooking.gotoBookings();
      await expect(guestBooking.upcomingCard(host.name)).toHaveCount(0);
    });

    await test.step("Специалист по-прежнему находится по свободному слоту", async () => {
      await guestBooking.gotoCatalog();
      await guestBooking.searchBySkill(skill);
      await expect(guestBooking.personCard(host.name)).toBeVisible();
    });
  });
});
