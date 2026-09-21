import { test, expect } from "@playwright/test";
import { makeUser, registerUser } from "../helpers/user";
import { toDateInputValue } from "../helpers/date";
import { ProfilePage } from "../pages/profile-page";
import { SlotsPage } from "../pages/slots-page";
import { CatalogPage } from "../pages/catalog-page";
import { BookingPage } from "../pages/booking-page";
import { MyBookingsPage } from "../pages/mybookings-page";

test("основной путь + гонка за слот: регистрация → навык → слот → поиск в каталоге → бронирование → «Мои встречи» у обоих → второй гость видит ошибку", async ({
  browser,
}) => {
  const runId = Date.now();
  const skillTag = `Playwright-demo-${runId}`;
  const host = makeUser("host", runId);
  const guest = makeUser("guest", runId);
  const guest2 = makeUser("guest2", runId);

  const hostContext = await browser.newContext();
  const guestContext = await browser.newContext();
  const guest2Context = await browser.newContext();
  const hostPage = await hostContext.newPage();
  const guestPage = await guestContext.newPage();
  const guest2Page = await guest2Context.newPage();
  const profilePage = new ProfilePage(hostPage);
  const slotsPage = new SlotsPage(hostPage);
  const guestCatalogPage = new CatalogPage(guestPage);
  const guestBookingPage = new BookingPage(guestPage);
  const guest2CatalogPage = new CatalogPage(guest2Page);
  const guest2BookingPage = new BookingPage(guest2Page);
  const guestMyBookingsPage = new MyBookingsPage(guestPage);
  const hostMyBookingsPage = new MyBookingsPage(hostPage);

  await test.step("Хост: регистрируется в PomidorQA", async () => {
    await registerUser(hostPage, host);
  });
 
  await test.step('Хост: добавляет навык «могу помочь» в профиле', async () => {
    await profilePage.goto();

    await profilePage.addSkill(skillTag, "can_help");

    await expect(profilePage.canHelpSkills).toContainText(skillTag);
  });

  await test.step("Хост: добавляет свободный слот на завтра", async () => {
    const tomorrow = new Date(Date.now() + 24 * 60 * 60 * 1000);
    const date = toDateInputValue(tomorrow);
    await slotsPage.goto();

    await slotsPage.addSlot(date, "12:00");

    await expect(slotsPage.slotCards.first()).toBeVisible();
  });

  await test.step("Гость: регистрируется отдельным аккаунтом", async () => {
    await registerUser(guestPage, guest);
  });

  await test.step("Гость: ищет хоста в каталоге по навыку (сценарий 9)", async () => {
    await guestCatalogPage.filterBySkill(skillTag);

    await expect(guestCatalogPage.personCard(host.name)).toBeVisible();
  });

  await test.step("Гость: открывает карточку хоста", async () => {
    await guestCatalogPage.openPersonCard(host.name);

    await expect(guestBookingPage.personName).toHaveText(host.name);
  });

  await test.step("Гость: кликает по дню и времени в календаре слотов", async () => {
    await guestBookingPage.waitForSlots();

    await guestBookingPage.pickFirstSlot();

    await expect(guestBookingPage.confirmDialog).toBeVisible();
  });
  
  // Важно: модалку guest2 открываем ДО confirm у guest.
  // Пока слот в UI ещё свободен — оба «человек открыл и отошёл».
  await test.step("Гость2: регистрируется отдельным аккаунтом", async () => {
    await registerUser(guest2Page, guest2);
  });

  await test.step("Гость2: ищет хоста в каталоге по навыку", async () => {
    await guest2CatalogPage.filterBySkill(skillTag);

    await expect(guest2CatalogPage.personCard(host.name)).toBeVisible();
  });

  await test.step("Гость2: открывает карточку хоста", async () => {
    await guest2CatalogPage.openPersonCard(host.name);

    await expect(guest2BookingPage.personName).toHaveText(host.name);
  });

  await test.step("Гость2: кликает по дню и времени в календаре слотов", async () => {
    await guest2BookingPage.waitForSlots();

    await guest2BookingPage.pickFirstSlot();

    await expect(guest2BookingPage.confirmDialog).toBeVisible();
  });

  await test.step("Гость: подтверждает бронирование первым — успех", async () => {
    await guestBookingPage.confirmBooking();

    const success = guestBookingPage.confirmSuccess;
    const error = guestBookingPage.confirmError;
    await expect(success.or(error)).toBeVisible({ timeout: 15_000 });
    if (await error.isVisible().catch(() => false)) {
      throw new Error(`Бронирование не удалось: ${await error.textContent()}`);
    }
  });

  await test.step("Гость2: пытается забронировать тот же слот вторым — видит ошибку", async () => {
    await guest2BookingPage.confirmBooking();

    const success2 = guest2BookingPage.confirmSuccess;
    const error2 = guest2BookingPage.confirmError;
    await expect(success2.or(error2)).toBeVisible({ timeout: 15_000 });
    if (await success2.isVisible().catch(() => false)) {
      throw new Error("Слот должен был быть занят, но бронирование прошло успешно");
    }
    await expect(error2).toBeVisible();
  });

  await test.step("Гость: видит бронирование в разделе «Мои встречи»", async () => {
    await expect(async () => {
      await guestMyBookingsPage.goto();
      const card = guestMyBookingsPage.cardName;

      await expect(card).toHaveText(host.name);
    }).toPass({ timeout: 10_000 });
  });

  await test.step("Хост: тоже видит это бронирование в своих «Мои встречи»", async () => {
    await expect(async () => {
      await hostMyBookingsPage.goto();
      const card = hostMyBookingsPage.cardName;

      await expect(card).toHaveText(guest.name);
    }).toPass({ timeout: 10_000 });
  });

  await hostContext.close();
  await guestContext.close();
  await guest2Context.close();
});