import { expect, test, type BrowserContext } from "@playwright/test";
import { DEFAULT_PROFILE_TIMEZONE, slotFormValues } from "../helpers/slot-time";
import { cleanupUsersViaApi, makeUser, registerUserViaApi } from "../helpers/user";
import { BookingPage } from "../pages/booking-page";
import { ProfilePage } from "../pages/profile-page";

// Требования п.5: время слота живёт в часовом поясе владельца. Владелец вводит 12:00
// и видит 12:00, и ровно то же время видит любой, кто смотрит его слоты, — независимо
// от пояса своего браузера. Тест проверяет обе стороны одновременно: это то место,
// где раньше расходились хост и гость (KD-1 в docs/coverage-matrix.md).

let accountContexts: BrowserContext[] = [];

test.describe("Часовой пояс слотов", () => {
  test.afterEach(async () => {
    await cleanupUsersViaApi(accountContexts);
    accountContexts = [];
  });

  test("владелец и гость видят одно и то же время слота", async ({ browser, page }, testInfo) => {
    const runId = Date.now();
    const host = makeUser("tz-host", runId);
    const skill = `Timezone-${runId}`;
    const slotTime = "12:00";
    const hostContext = await browser.newContext({ baseURL: testInfo.project.use.baseURL });
    accountContexts = [hostContext];
    const hostPage = await hostContext.newPage();
    const hostProfile = new ProfilePage(hostPage);
    const hostSlots = new BookingPage(hostPage);
    const guest = new BookingPage(page);

    await test.step("Хост добавляет навык и слот на 12:00 следующего дня", async () => {
      await registerUserViaApi(hostContext.request, host);
      await hostProfile.goto();
      await hostProfile.addSkill(skill, "can_help");
      await hostSlots.gotoSlots();
      const { date } = slotFormValues(24 * 60 * 60 * 1000);
      await hostSlots.addSlot(date, slotTime);
    });

    await test.step("В своих слотах хост видит введённое время", async () => {
      await expect(hostSlots.slotCard(slotTime)).toBeVisible();
    });

    await test.step("Гость открывает страницу хоста и раскрывает день", async () => {
      await guest.findPerson(skill, host.name);
      await guest.openPerson(host.name);
      await guest.calendarDay.first().click();
    });

    await test.step("Гость видит то же время и подпись, в чьём поясе оно показано", async () => {
      await expect(guest.calendarTime.first()).toHaveText(slotTime);
      await expect(guest.calendarTimezoneHint).toContainText(DEFAULT_PROFILE_TIMEZONE);
    });
  });
});
