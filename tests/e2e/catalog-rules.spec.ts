import { expect, test, type BrowserContext } from "@playwright/test";
import { cleanupUsersViaApi, makeUser, registerUserViaApi } from "../helpers/user";
import { BookingPage } from "../pages/booking-page";
import { ProfilePage } from "../pages/profile-page";

let accountContexts: BrowserContext[] = [];

test.describe("Каталог: правила подбора", () => {
  test.afterEach(async () => {
    await cleanupUsersViaApi(accountContexts);
    accountContexts = [];
  });

  test("специалист появляется в каталоге только после добавления свободного слота", async ({
    browser,
    page,
  }, testInfo) => {
    const runId = Date.now();
    const host = makeUser("catalog-availability", runId);
    const skill = `Availability-${runId}`;
    const hostContext = await browser.newContext({ baseURL: testInfo.project.use.baseURL });
    accountContexts = [hostContext];
    const hostProfile = new ProfilePage(await hostContext.newPage());
    const hostBooking = new BookingPage(hostProfile.page);
    const catalog = new BookingPage(page);

    await test.step("Создаём специалиста с навыком, но без слотов", async () => {
      await registerUserViaApi(hostContext.request, host);
      await hostProfile.goto();
      await hostProfile.addSkill(skill, "can_help");
    });

    await test.step("Без свободного слота специалист отсутствует в выдаче", async () => {
      await catalog.gotoCatalog();
      await catalog.searchBySkill(skill);
      await expect(catalog.personCard(host.name)).toHaveCount(0);
    });

    await test.step("Специалист добавляет свободный слот", async () => {
      const tomorrow = new Date(Date.now() + 24 * 60 * 60 * 1000);
      await hostBooking.gotoSlots();
      await hostBooking.addSlot(tomorrow.toISOString().slice(0, 10), "13:00");
    });

    await test.step("После добавления слота специалист появляется в выдаче", async () => {
      await catalog.findPerson(skill, host.name);
      await expect(catalog.personCard(host.name)).toBeVisible();
    });
  });

  // Фильтр по типу навыка проверяется в known-defects.spec.ts: реализация ищет по всем
  // навыкам, а требования п.8 ограничивают поиск разделом «могу помочь».

  test("участник не видит себя в собственном каталоге", async ({ browser }, testInfo) => {
    const runId = Date.now();
    const host = makeUser("catalog-self", runId);
    const skill = `SelfHidden-${runId}`;
    const hostContext = await browser.newContext({ baseURL: testInfo.project.use.baseURL });
    accountContexts = [hostContext];
    const hostProfile = new ProfilePage(await hostContext.newPage());
    const hostBooking = new BookingPage(hostProfile.page);

    await test.step("Создаём специалиста с навыком и свободным слотом", async () => {
      await registerUserViaApi(hostContext.request, host);
      await hostProfile.goto();
      await hostProfile.addSkill(skill, "can_help");
      const tomorrow = new Date(Date.now() + 24 * 60 * 60 * 1000);
      await hostBooking.gotoSlots();
      await hostBooking.addSlot(tomorrow.toISOString().slice(0, 10), "14:00");
    });

    await test.step("Специалист ищет свой же навык в каталоге", async () => {
      await hostBooking.gotoCatalog();
      await hostBooking.searchBySkill(skill);
    });

    await test.step("Себя он в выдаче не находит", async () => {
      await expect(hostBooking.personCard(host.name)).toHaveCount(0);
      await expect(hostBooking.catalogEmptyMessage).toBeVisible();
    });
  });

  test("неизвестный навык показывает пустую выдачу", async ({ page }) => {
    const skill = `Missing-${Date.now()}`;
    const catalog = new BookingPage(page);

    await test.step("Ищем уникальный несуществующий навык", async () => {
      await catalog.gotoCatalog();
      await catalog.searchBySkill(skill);
    });

    await test.step("Каталог сообщает об отсутствии результатов и сохраняет фильтр", async () => {
      await expect(catalog.catalogCard).toHaveCount(0);
      await expect(catalog.catalogEmptyMessage).toBeVisible();
      await expect(page).toHaveURL(new RegExp(`skill=${skill}`));
    });
  });
});
