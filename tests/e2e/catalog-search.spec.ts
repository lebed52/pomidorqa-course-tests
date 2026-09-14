import { test, expect, type BrowserContext } from "@playwright/test";
import {
  cleanupUsersViaApi,
  makeUser,
  registerUserViaApi,
} from "../helpers/user";
import { BookingPage } from "../pages/booking-page";
import { ProfilePage } from "../pages/profile-page";

test.describe("Каталог", () => {
  test("гость находит хоста по навыку — хост свою карточку не видит", async ({
    browser,
  }) => {
    const runId = Date.now() * 100 + test.info().workerIndex;
    const skillTag = `Catalog-search-${runId}`;
    const host = makeUser("host", runId);
    const guest = makeUser("guest", runId);

    const hostContext = await browser.newContext();
    const guestContext = await browser.newContext();
    const hostPage = await hostContext.newPage();
    const guestPage = await guestContext.newPage();
    const created: BrowserContext[] = [];

    const hostProfile = new ProfilePage(hostPage);
    const hostBooking = new BookingPage(hostPage);
    const guestBooking = new BookingPage(guestPage);

    try {
      await test.step("Хост: создаётся через API", async () => {
        await registerUserViaApi(hostContext.request, host);
        created.push(hostContext);
      });

      await test.step("Гость: создаётся через API", async () => {
        await registerUserViaApi(guestContext.request, guest);
        created.push(guestContext);
      });

      await test.step("Хост: добавляет навык", async () => {
        await hostProfile.goto();
        await hostProfile.saveProfile();
        await hostProfile.goto();
        await hostProfile.addSkill(skillTag);
      });

      await test.step("Хост видит добавленный навык", async () => {
        await expect(hostProfile.canHelpSkills).toContainText(skillTag);
      });

      await test.step("Хост: добавляет свободный слот на завтра", async () => {
        await hostBooking.gotoSlots();
        await hostBooking.addTomorrowSlot();
      });

      await test.step("Слот хоста виден", async () => {
        await expect(hostBooking.slotCard).toHaveCount(1);
      });

      await test.step("Хост: ищет свой навык", async () => {
        await hostBooking.search(skillTag);
      });

      await test.step("В выдаче нет своей карточки", async () => {
        await expect(hostBooking.catalogEmpty).toBeVisible();
        await expect(hostBooking.cardByName(host.name)).toBeHidden();
      });

      await test.step("Гость: ищет хоста по навыку", async () => {
        await guestBooking.search(skillTag);
      });

      await test.step("В выдаче карточка хоста по имени", async () => {
        await expect(guestBooking.cardByName(host.name)).toBeVisible();
        await expect(guestBooking.catalogEmpty).toBeHidden();
      });
    } finally {
      try {
        await cleanupUsersViaApi(created);
      } finally {
        await hostContext.close();
        await guestContext.close();
      }
    }
  });
});
