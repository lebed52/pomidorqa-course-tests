import { expect, test, type BrowserContext } from "@playwright/test";
import { cleanupUsersViaApi, makeUser, registerUserViaApi } from "../helpers/user";
import { BookingPage } from "../pages/booking-page";
import { ProfilePage } from "../pages/profile-page";

// Требования п.7: слот нельзя создать в прошлом, участник может удалить только свой
// слот со статусом free, забронированный слот удалить нельзя.

let accountContexts: BrowserContext[] = [];

function dateAfterDays(days: number): string {
  return new Date(Date.now() + days * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
}

test.describe("Слоты: правила создания и удаления", () => {
  test.afterEach(async () => {
    await cleanupUsersViaApi(accountContexts);
    accountContexts = [];
  });

  test("дату в прошлом форма не отправляет", async ({ browser }, testInfo) => {
    const user = makeUser("slot-past", Date.now());
    const context = await browser.newContext({ baseURL: testInfo.project.use.baseURL });
    accountContexts = [context];
    const slots = new BookingPage(await context.newPage());

    await test.step("Создаём участника и открываем свои слоты", async () => {
      await registerUserViaApi(context.request, user);
      await slots.gotoSlots();
    });

    await test.step("Пробуем выбрать вчерашнюю дату и отправить форму", async () => {
      await slots.slotsDateInput.fill(dateAfterDays(-1));
      await slots.slotsTimeInput.fill("12:00");
      await slots.slotsAddSubmit.click();
    });

    await test.step("Дата не проходит валидацию, слот не появился", async () => {
      expect(await slots.slotsDateInput.evaluate((input) => input.validity.valid)).toBe(false);
      await expect(slots.slotsCard).toHaveCount(0);
    });
  });

  test("свободный слот удаляется, второй остаётся на месте", async ({ browser }, testInfo) => {
    const user = makeUser("slot-delete", Date.now());
    const tomorrow = dateAfterDays(1);
    const context = await browser.newContext({ baseURL: testInfo.project.use.baseURL });
    accountContexts = [context];
    const slots = new BookingPage(await context.newPage());

    await test.step("Создаём участника и добавляем два свободных слота", async () => {
      await registerUserViaApi(context.request, user);
      await slots.gotoSlots();
      await slots.addSlot(tomorrow, "09:00");
      await slots.addSlot(tomorrow, "10:00");
    });

    await test.step("Удаляем первый слот", async () => {
      await slots.deleteSlot("09:00");
    });

    await test.step("После перезагрузки остался только второй слот", async () => {
      await slots.page.reload();
      await expect(slots.slotsCard).toHaveCount(1);
      await expect(slots.slotCard("10:00")).toBeVisible();
    });
  });

  test("у забронированного слота нет кнопки удаления", async ({ browser }, testInfo) => {
    const runId = Date.now();
    const host = makeUser("slot-booked-host", runId);
    const guest = makeUser("slot-booked-guest", runId);
    const skill = `BookedSlot-${runId}`;
    const hostContext = await browser.newContext({ baseURL: testInfo.project.use.baseURL });
    const guestContext = await browser.newContext({ baseURL: testInfo.project.use.baseURL });
    accountContexts = [hostContext, guestContext];
    const hostPage = await hostContext.newPage();
    const hostProfile = new ProfilePage(hostPage);
    const hostSlots = new BookingPage(hostPage);
    const guestBooking = new BookingPage(await guestContext.newPage());

    await test.step("Хост создаёт навык и единственный свободный слот", async () => {
      await registerUserViaApi(hostContext.request, host);
      await hostProfile.goto();
      await hostProfile.addSkill(skill, "can_help");
      await hostSlots.gotoSlots();
      await hostSlots.addSlot(dateAfterDays(1), "11:00");
    });

    await test.step("У свободного слота кнопка удаления есть", async () => {
      await expect(hostSlots.slotDeleteButton("11:00")).toBeVisible();
    });

    await test.step("Гость бронирует этот слот", async () => {
      await registerUserViaApi(guestContext.request, guest);
      await guestBooking.findPerson(skill, host.name);
      await guestBooking.openPerson(host.name);
      await guestBooking.selectFirstAvailableSlot();
      await guestBooking.confirmBooking();
      await expect(guestBooking.confirmSuccess).toBeVisible();
    });

    await test.step("У хоста слот стал забронированным и потерял кнопку удаления", async () => {
      await expect(async () => {
        await hostSlots.page.reload();
        await expect(hostSlots.slotCard("11:00")).toHaveAttribute("data-slot-status", "booked");
      }).toPass({ timeout: 15_000 });
      await expect(hostSlots.slotDeleteButton("11:00")).toHaveCount(0);
    });
  });
});
