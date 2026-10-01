import { test, expect, type BrowserContext } from "@playwright/test";
import { makeUser, registerUserViaApi, openBookingModal, cleanupUsersViaApi, ROUTES } from "../helpers/user";
import { ProfilePage } from "../Pages/profile-page";
import { BookingPage } from "../Pages/booking-page";
import { MySlotsPage } from "../Pages/my-slots-page";


test.describe("Отмену бронирования видят и хост и гость", () => {
    const accountContexts: BrowserContext[] = [];

    test.afterEach(async () => {
        await cleanupUsersViaApi(accountContexts);
        accountContexts.length = 0;
    });

    test("Отмену бронирования видят и хост и гость", async ({ browser }) => { 
  const runId = Date.now();
  const skillTag = `Korozia-metal-${runId}`;
  const host = makeUser("Pank", runId);
  const guest = makeUser("Normis", runId);

  const hostContext = await browser.newContext();
  accountContexts.push(hostContext);
  const normisContext = await browser.newContext();
  accountContexts.push(normisContext);

  const hostPage = await hostContext.newPage();
  const normisPage = await normisContext.newPage();


  const hostProfilePage = new ProfilePage(hostPage);
  const normisBookingPage = new BookingPage(normisPage);
  const hostBookingPage = new BookingPage(hostPage);
  const hostMySlotsPage = new MySlotsPage(hostPage);

    await test.step("Хост: регистрируется в PomidorQA", async () => {
        await registerUserViaApi(hostPage, host);
      });
    
    
      await test.step('Хост: добавляет навык «могу помочь» в профиле', async () => {
        await hostPage.goto(ROUTES.profile);
        await hostProfilePage.addSkill(skillTag, "can_help");
      });
    
      await test.step("Хост: Видит навык в профиле", async () => {
        await expect(hostProfilePage.canHelpSkills).toContainText(skillTag);
      });
    
    
      await test.step("Хост: добавляет свободный слот на завтра", async () => {
        const tomorrow = new Date(Date.now() + 24 * 60 * 60 * 1000);
        const date = tomorrow.toISOString().slice(0, 10);
        
        await hostPage.goto(ROUTES.mySlots);
        await hostMySlotsPage.addSlot(date, "12:00");
      });
    
      await test.step("Хост: Видит карточку слота", async () => {
        await expect(hostMySlotsPage.slotsCard.first()).toBeVisible();
      });
    
      await test.step("Гость: регистрируется отдельным аккаунтом", async () => {
        await registerUserViaApi(normisPage, guest);
      });
    
      await test.step("Гость: ищет хоста в каталоге по навыку (сценарий 9)", async () => {
        await normisBookingPage.filterCatalog(skillTag);
      });
    
      await test.step("Гость: Видит карточку хоста", async () => {
        await expect(
          normisBookingPage.catalogCard.filter({ hasText: host.name })
        ).toBeVisible();
      });
    
      await test.step("Гость: открывает карточку хоста", async () => {
        await normisBookingPage.catalogCard.filter({ hasText: host.name }).click();
      });
    
      await test.step("Гость: Видит имя хоста", async () => {
        await expect(normisBookingPage.personName).toHaveText(host.name);
      });
    
      await test.step("Гость: кликает по дню и времени в календаре слотов", async () => {
        await openBookingModal(normisPage);
      });await test.step("Гость: подтверждает бронирование в модалке", async () => {
        await normisBookingPage.bookingConfirmButton.click();
      });
      await test.step("Гость: Видит успешное бронирование", async () => {
        const success = normisBookingPage.bookingConfirmSuccess;
        const error = normisBookingPage.bookingConfirmError;

        await expect(success.or(error)).toBeVisible({ timeout: 15_000 });
        if (await error.isVisible().catch(() => false)) {
          throw new Error(`Бронирование не удалось: ${await error.textContent()}`);
        }
      });
    
      await test.step("Хост: переходит в «Мои встречи»", async () => {
        await hostPage.goto(ROUTES.bookings);
      });
    
      await test.step("Хост: Видит карточку бронирования", async () => {
        await expect(hostBookingPage.bookingsUpcomingSection.first()).toBeVisible();
      });
    
      await test.step("Гость переходит в «Мои встречи»", async () => {
        await normisPage.goto(ROUTES.bookings)
      });
      await test.step("Гость: Видит карточку бронирования", async () => {
        await expect(normisBookingPage.bookingsUpcomingSection.first()).toBeVisible();
      });
      await test.step("Гость: Отменяет бронирование", async () => {
        await normisBookingPage.bookingCancel();
      });
      await test.step("Гость: Видит 0 бронирования", async () => {
        await expect(normisBookingPage.bookingsCard).toHaveCount(0);
      });
      await test.step("Хост: Переходит в «Мои встречи»", async () => {
        await hostPage.goto(ROUTES.bookings);
      });
      await test.step("Хост: Не видит бронирования с гостём", async () => {
        await expect(hostBookingPage.bookingsCard).toHaveCount(0);
      });
    });
});