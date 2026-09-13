import { test, expect } from "@playwright/test";
import { makeUser, registerUser } from "../helpers/user";
import { BookingPage } from "../pages/booking-page";
import { ProfilePage } from "../pages/profile-page";

test.describe("Каталог", () => {
  test("гость находит хоста по навыку — хост свою карточку не видит", async ({
    browser,
  }) => {
    const runId = Date.now();
    const skillTag = `Catalog-search-${runId}`;
    const host = makeUser("host", runId);
    const guest = makeUser("guest", runId);

    const hostContext = await browser.newContext();
    const guestContext = await browser.newContext();
    const hostPage = await hostContext.newPage();
    const guestPage = await guestContext.newPage();

    const hostProfile = new ProfilePage(hostPage);
    const hostBooking = new BookingPage(hostPage);
    const guestBooking = new BookingPage(guestPage);

    try {
      await test.step("Хост: регистрируется в PomidorQA", async () => {
        await registerUser(hostPage, host);
      });

      await test.step("Хост: добавляет навык и свободный слот на завтра", async () => {
        await hostProfile.goto();
        await hostProfile.fillProfileName(host.name);
        await hostProfile.saveProfile();
        await hostProfile.goto();
        await hostProfile.addSkill(skillTag);
        await expect(hostProfile.canHelpSkills).toContainText(skillTag);
        await hostBooking.gotoSlots();
        await hostBooking.addTomorrowSlot();
        await expect(hostBooking.slotCard).toHaveCount(1);
      });

      await test.step("Хост: ищет свой навык", async () => {
        await hostBooking.search(skillTag);
      });

      await test.step("В выдаче нет своей карточки", async () => {
        await expect(hostBooking.catalogEmpty).toBeVisible();
        await expect(hostBooking.cardByName(host.name)).toBeHidden();
      });

      await test.step("Гость: регистрируется отдельным аккаунтом", async () => {
        await registerUser(guestPage, guest);
      });

      await test.step("Гость: ищет хоста по навыку", async () => {
        await guestBooking.search(skillTag);
      });

      await test.step("В выдаче карточка хоста по имени", async () => {
        await expect(guestBooking.cardByName(host.name)).toBeVisible();
        await expect(guestBooking.catalogEmpty).toBeHidden();
      });
    } finally {
      await hostContext.close();
      await guestContext.close();
    }
  });
});
