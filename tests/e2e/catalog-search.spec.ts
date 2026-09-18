import { expect, test, type BrowserContext } from "@playwright/test";
import { cleanupUsersViaApi, makeUser, registerUserViaApi } from "../helpers/user";
import { BookingPage } from "../pages/booking-page";
import { ProfilePage } from "../pages/profile-page";

let hostContexts: BrowserContext[] = [];

test.describe("Поиск по навыку в каталоге", () => {
  test.afterEach(async () => {
    await cleanupUsersViaApi(hostContexts);
    hostContexts = [];
  });

  test("показывает специалиста с искомым навыком и свободным слотом", async (
    { browser, page },
    testInfo
  ) => {
    const runId = Date.now();
    const skillTag = `SearchQA-${runId}`;
    const host = makeUser("search-host", runId);
    const hostContext = await browser.newContext({
      baseURL: testInfo.project.use.baseURL,
    });
    hostContexts = [hostContext];

    const hostPage = await hostContext.newPage();
    const hostProfile = new ProfilePage(hostPage);
    const hostBooking = new BookingPage(hostPage);
    const catalog = new BookingPage(page);

    await test.step("Хост регистрируется через API", async () => {
      await registerUserViaApi(hostContext.request, host);
    });

    await test.step("Хост добавляет навык в профиль", async () => {
      await hostProfile.goto();
      await hostProfile.addSkill(skillTag, "can_help");
    });

    await test.step("Добавленный навык отображается в профиле", async () => {
      await expect(hostProfile.canHelpSkills).toContainText(skillTag);
    });

    await test.step("Хост добавляет свободный слот на завтра", async () => {
      const tomorrow = new Date(Date.now() + 24 * 60 * 60 * 1000);

      await hostBooking.gotoSlots();
      await hostBooking.addSlot(tomorrow.toISOString().slice(0, 10), "12:00");
    });

    await test.step("Свободный слот отображается у хоста", async () => {
      await expect(hostBooking.slotsCard.first()).toBeVisible();
    });

    await test.step("Гость открывает каталог и ищет навык", async () => {
      await catalog.gotoCatalog();
      await catalog.searchBySkill(skillTag);
    });

    await test.step("В результатах отображается нужный специалист", async () => {
      await expect(catalog.personCard(host.name)).toBeVisible();
    });
  });
});
