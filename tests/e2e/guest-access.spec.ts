import { expect, test, type BrowserContext } from "@playwright/test";
import { cleanupUsersViaApi, makeUser, registerUserViaApi } from "../helpers/user";
import { BookingPage } from "../pages/booking-page";
import { PersonPage } from "../pages/person-page";
import { ProfilePage } from "../pages/profile-page";

// Требования п.3: гость без регистрации просматривает каталог и страницу участника,
// но забронировать звонок не может — для этого нужен аккаунт.
// Гость здесь — обычная фикстура page: в ней нет сессии PomidorQA.

let accountContexts: BrowserContext[] = [];

test.describe("Гостевой доступ без регистрации", () => {
  test.afterEach(async () => {
    await cleanupUsersViaApi(accountContexts);
    accountContexts = [];
  });

  test("гость видит специалиста и его слоты, но бронирование требует входа", async ({
    browser,
    page,
  }, testInfo) => {
    const runId = Date.now();
    const host = makeUser("guest-view-host", runId);
    const skill = `GuestView-${runId}`;
    const hostContext = await browser.newContext({ baseURL: testInfo.project.use.baseURL });
    accountContexts = [hostContext];
    const hostPage = await hostContext.newPage();
    const hostProfile = new ProfilePage(hostPage);
    const hostSlots = new BookingPage(hostPage);
    const guestCatalog = new BookingPage(page);
    const person = new PersonPage(page);

    await test.step("Специалист заводит навык и свободный слот", async () => {
      await registerUserViaApi(hostContext.request, host);
      await hostProfile.goto();
      await hostProfile.addSkill(skill, "can_help");
      const tomorrow = new Date(Date.now() + 24 * 60 * 60 * 1000);
      await hostSlots.gotoSlots();
      await hostSlots.addSlot(tomorrow.toISOString().slice(0, 10), "17:00");
    });

    await test.step("Гость находит специалиста в каталоге", async () => {
      await guestCatalog.findPerson(skill, host.name);
      await expect(guestCatalog.personCard(host.name)).toBeVisible();
    });

    await test.step("Гость открывает страницу специалиста", async () => {
      await guestCatalog.openPerson(host.name);
    });

    await test.step("На странице видны имя, навык и свободное время", async () => {
      await expect(person.name).toHaveText(host.name);
      await expect(person.canHelpSection).toContainText(skill);
      await expect(guestCatalog.calendarTime.first()).toBeVisible();
    });

    await test.step("Гость пытается подтвердить бронирование", async () => {
      await guestCatalog.selectFirstAvailableSlot();
      await guestCatalog.confirmBooking();
    });

    await test.step("Вместо брони гость видит требование войти в аккаунт", async () => {
      await expect(guestCatalog.confirmError).toContainText("Нужно войти в аккаунт PomidorQA");
      await expect(guestCatalog.confirmSuccess).toHaveCount(0);
    });

    await test.step("Слот остался свободным и специалист по-прежнему в каталоге", async () => {
      await page.reload();
      await expect(guestCatalog.calendarTime.first()).toBeVisible();
      await guestCatalog.findPerson(skill, host.name);
      await expect(guestCatalog.personCard(host.name)).toBeVisible();
    });
  });

  test("приватные страницы перенаправляют гостя на вход", async ({ page }) => {
    const privatePaths = ["/pomidorqa/profile", "/pomidorqa/profile/slots", "/pomidorqa/bookings"];

    for (const path of privatePaths) {
      await test.step(`Гость открывает ${path}`, async () => {
        await page.goto(path);
      });

      await test.step(`${path} отдаёт страницу входа`, async () => {
        await expect(page).toHaveURL(/\/pomidorqa\/auth\/login$/);
      });
    }
  });
});
