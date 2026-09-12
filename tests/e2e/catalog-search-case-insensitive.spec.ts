import { test, expect } from "@playwright/test";
import { makeUser, registerUserViaApi, deleteCurrentTestUser } from "../helpers/user";
import { ProfilePage } from "../pages/ProfilePage";
import { BookingPage } from "../pages/BookingPage";

test.describe("Каталог: поиск по навыку без учета регистра и формы записи", () => {
  test("поиск находит человека по навыку в разном регистре и частичном совпадении", async ({ browser }) => {
    const runId = crypto.randomUUID().slice(0, 10);
    const baseSkill = "Playwright";
    const skillId = crypto.randomUUID();
    const skillTag = `${baseSkill}-${skillId}`;
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
      await test.step("Хост: регистрируется в PomidorQA через API", async () => {
        await registerUserViaApi(hostPage, host);
      });

      await test.step("Хост: добавляет навык в профиль", async () => {
        await hostProfile.goto();
        await hostProfile.addSkill(skillTag, "can_help");
      });

      await test.step("Хост: проверяет, что навык появился в профиле", async () => {
        await expect(hostProfile.canHelpSkills).toContainText(skillTag);
      });

      await test.step("Хост: добавляет свободный слот на завтра", async () => {
        await hostBooking.gotoSlots();
        await hostBooking.addSlot();
      });

      await test.step("Хост: проверяет, что слот появился в календаре", async () => {
        await expect(hostBooking.slotsCard.first()).toBeVisible();
      });

      await test.step("Гость: регистрируется отдельным аккаунтом через API", async () => {
        await registerUserViaApi(guestPage, guest);
      });

      await test.step("Гость: ищет хоста по части навыка в нижнем регистре", async () => {
        await guestBooking.searchBySkill(`playwright-${skillId.toLowerCase()}`);
      });

      await test.step("Гость: проверяет, что карточка хоста содержит полный навык в нижнем регистре", async () => {
        const resultCard = guestBooking.catalogCard.filter({ hasText: host.name }).first();
        await expect(resultCard).toContainText(skillTag, { ignoreCase: true });
      });

      await test.step("Гость: ищет хоста по части навыка в верхнем регистре", async () => {
        await guestBooking.catalogFilterInput.fill("");
        await guestBooking.searchBySkill(`PLAYWRIGHT-${skillId.toUpperCase()}`);
      });

      await test.step("Гость: проверяет, что карточка хоста содержит полный навык в верхнем регистре", async () => {
        const resultCard = guestBooking.catalogCard.filter({ hasText: host.name }).first();
        await expect(resultCard).toContainText(skillTag, { ignoreCase: true });
      });

      await test.step("Гость: ищет хоста только по части UUID", async () => {
        await guestBooking.catalogFilterInput.fill("");
        await guestBooking.searchBySkill(skillId.slice(0, 8));
      });

      await test.step("Гость: проверяет, что карточка хоста содержит полный навык по части UUID", async () => {
        const resultCard = guestBooking.catalogCard.filter({ hasText: host.name }).first();
        await expect(resultCard).toContainText(skillTag, { ignoreCase: true });
      });
    } finally {
      await deleteCurrentTestUser(hostPage);
      await deleteCurrentTestUser(guestPage);
      await hostContext.close();
      await guestContext.close();
    }
  });
});
