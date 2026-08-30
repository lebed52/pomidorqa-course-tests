import { test, expect } from "@playwright/test";
import { makeUser, registerUser } from "../helpers/user";
import { createHostAndGuestsContexts, closeApps } from "../helpers/booking";

test("основной путь + гонка за слот: регистрация → навык → слот → поиск → бронирование", async ({ browser }) => {
  // Увеличиваем таймаут для тяжелого E2E-теста
  test.setTimeout(120_000);

  const skillTag = `Playwright-demo-${Date.now()}`;
  const hostUser = makeUser("host");
  const guestUser = makeUser("guest");
  const guest2User = makeUser("guest2");

  // Старт теста в одну строку благодаря Фабрике контекстов
  const { hostApp, guestApp, guest2App } = await createHostAndGuestsContexts(browser);

  try {
    await test.step("Хост: регистрируется и добавляет навык", async () => {
      await registerUser(hostApp.page, hostUser);
      await hostApp.profilePage.goto();
      await hostApp.profilePage.addSkill(skillTag, "can_help");
      await expect(hostApp.profilePage.canHelpSkills).toContainText(skillTag);
    });

    await test.step("Хост: добавляет свободный слот на завтра", async () => {
      await hostApp.bookingPage.goToSlots();
      const tomorrow = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
      await hostApp.bookingPage.addSlot(tomorrow, "12:00");
      await expect(hostApp.bookingPage.firstSlotCard).toBeVisible();
    });

    await test.step("Гость 1: ищет хоста и открывает окно подтверждения слота", async () => {
      await registerUser(guestApp.page, guestUser);
      await guestApp.bookingPage.searchCatalog(skillTag);
      await guestApp.bookingPage.openPerson(hostUser.name);

      await expect(async () => {
        await guestApp.bookingPage.pickFirstSlot();
        await expect(guestApp.bookingPage.confirmDialog).toBeVisible({ timeout: 1000 });
      }).toPass({ timeout: 15_000 });
    });

    await test.step("Гость 2: открывает окно бронирования на ТОТ ЖЕ слот", async () => {
      await registerUser(guest2App.page, guest2User);
      await guest2App.bookingPage.searchCatalog(skillTag);
      await guest2App.bookingPage.openPerson(hostUser.name);

      await expect(async () => {
        await guest2App.bookingPage.pickFirstSlot();
        await expect(guest2App.bookingPage.confirmDialog).toBeVisible({ timeout: 1000 });
      }).toPass({ timeout: 15_000 });
    });

    await test.step("Гость 1: подтверждает первым и получает успех", async () => {
      await guestApp.bookingPage.confirmBooking();
      const result = await guestApp.bookingPage.waitForBookingResult();
      
      if (result === "error") {
        const errorText = await guestApp.bookingPage.confirmError.textContent();
        throw new Error(`Бронирование не удалось: ${errorText}`);
      }
    });

    await test.step("Гость 2: пытается подтвердить вторым и видит алерт об ошибке", async () => {
      await guest2App.bookingPage.confirmBooking();
      const result = await guest2App.bookingPage.waitForBookingResult();
      
      if (result === "success") {
        throw new Error("Слот должен был быть занят, но бронирование прошло успешно");
      }
      await expect(guest2App.bookingPage.confirmError).toBeVisible();
    });

    await test.step("Синхронизация: проверка бронирований в личных кабинетах", async () => {
      await expect(async () => {
        await guestApp.bookingPage.goToBookings();
        await expect(guestApp.bookingPage.firstBookingName).toHaveText(hostUser.name);
      }).toPass({ timeout: 10_000 });

      await expect(async () => {
        await hostApp.bookingPage.goToBookings();
        await expect(hostApp.bookingPage.firstBookingName).toHaveText(guestUser.name);
      }).toPass({ timeout: 10_000 });
    });

  } finally {
    // Гарантированно очищаем оперативную память при любом исходе теста
    await closeApps([hostApp, guestApp, guest2App]);
  }
});