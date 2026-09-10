import { test, expect, type BrowserContext, type Page } from "@playwright/test";
import { registerUser, makeUser, type TestUser } from "../helpers/user";
import { ProfilePage } from "../pages/profile-page";
import { BookingPage } from "../pages/booking-page";

test.describe("Поиск собеседника", () => {
  let skillTag: string;
  let host: TestUser;
  let guest: TestUser;

  let hostContext: BrowserContext;
  let guestContext: BrowserContext;
  
  let hostPage: Page;
  let guestPage: Page;

  let hostProfile: ProfilePage;
  let hostBooking: BookingPage;
  let guestBooking: BookingPage;

  test.beforeEach(async ({ browser }) => {
    test.setTimeout(90_000);
    
    const runId = Date.now();
    skillTag = `Playwright-demo-${runId}`;
    host = makeUser("host", runId);
    guest = makeUser("guest", runId);

    hostContext = await browser.newContext();
    guestContext = await browser.newContext();
    
    hostPage = await hostContext.newPage();
    guestPage = await guestContext.newPage();

    hostProfile = new ProfilePage(hostPage);
    hostBooking = new BookingPage(hostPage);
    guestBooking = new BookingPage(guestPage);
  });

  test.afterEach(async () => {
    await hostContext.close();
    await guestContext.close();
  });

  test("Позитивный: поиск по полному наименованию навыка ", async () => {
    await test.step("Хост: регистрируется в PomidorQA", async () => {
      await registerUser(hostPage, host);
    });
   
    await test.step("Хост: добавляет навык «могу помочь» в профиле", async () => {
      await hostProfile.goto();
      await hostProfile.addSkill(skillTag, "can_help");
    });

    await test.step("Хост: проверяет отображение добавленного навыка", async () => {
      await expect(hostProfile.canHelpSkills).toContainText(skillTag);
    });

    await test.step("Хост: добавляет свободный слот на завтра", async () => {
      await hostBooking.addSlot(host.slotTime);
    });

    await test.step("Хост: проверяет появление карточки созданного слота", async () => {
      await expect(hostBooking.slotsCard.first()).toBeVisible();
    });

    await test.step("Гость: регистрируется отдельным аккаунтом", async () => {
      await registerUser(guestPage, guest);
    });

    await test.step("Гость: ищет хоста в каталоге по навыку", async () => {
      await guestBooking.searchBySkill(skillTag);
    });

    await test.step("Гость: проверяет наличие карточки хоста в результатах поиска", async () => {
      await expect(guestBooking.catalogCard.filter({ hasText: host.name })).toBeVisible();
    });
  });

  test("Негативный: поиск по имени хоста неуспешен ", async () => {
    await test.step("Хост: регистрируется в PomidorQA", async () => {
      await registerUser(hostPage, host);
    });
   
    await test.step("Хост: добавляет навык «могу помочь» в профиле", async () => {
      await hostProfile.goto();
      await hostProfile.addSkill(skillTag, "can_help");
    });

    await test.step("Хост: проверяет отображение добавленного навыка", async () => {
      await expect(hostProfile.canHelpSkills).toContainText(skillTag);
    });

    await test.step("Хост: добавляет свободный слот на завтра", async () => {
      await hostBooking.addSlot(host.slotTime);
    });

    await test.step("Хост: проверяет появление карточки созданного слота", async () => {
      await expect(hostBooking.slotsCard.first()).toBeVisible();
    });

    await test.step("Гость: регистрируется отдельным аккаунтом", async () => {
      await registerUser(guestPage, guest);
    });

    await test.step("Гость: ищет карточку в каталоге по имени Хоста", async () => {
      await guestBooking.searchBySkill(host.name);
    });

    await test.step("Гость: проверяет, что карточки Хоста не отображаются", async () => {
      await expect(guestBooking.catalogCard.filter({ hasText: host.name })).not.toBeVisible();
    });
  });
});
