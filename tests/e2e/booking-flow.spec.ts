import { test, expect } from "@playwright/test";
import { makeUser, registerUser, openBookingModal, ROUTES } from "../helpers/user";
import { ProfilePage } from "../Pages/profile-page";
import { BookingPage } from "../Pages/booking-page";
import { MySlotsPage } from "../Pages/my-slots-page";

test("основной путь: регистрация → навык → слот → поиск в каталоге → бронирование → «Мои встречи» у обоих", async ({
  browser,
}) => { 
  const runId = Date.now();
  const skillTag = `Korozia-metal-${runId}`;
  const host = makeUser("Pank", runId);
  const guest = makeUser("Normis", runId);
  const guest2 = makeUser("Normis2", runId);

  // Три независимых аккаунта = три независимых браузерных контекста
  const hostContext = await browser.newContext();
  const normisContext = await browser.newContext();
  const normis2Context = await browser.newContext();
  const hostPage = await hostContext.newPage();
  const normisPage = await normisContext.newPage();
  const normis2Page = await normis2Context.newPage();

  const hostProfilePage = new ProfilePage(hostPage);
  const hostBookingPage = new BookingPage(hostPage);
  const normisBookingPage = new BookingPage(normisPage);
  const normis2BookingPage = new BookingPage(normis2Page);
  const hostMySlotsPage = new MySlotsPage(hostPage);

  await test.step("Хост: регистрируется в PomidorQA", async () => {
    await registerUser(hostPage, host);
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
    await registerUser(normisPage, guest);
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
  });
  
  await test.step("Гость2: регистрируется отдельным аккаунтом", async () => {
    await registerUser(normis2Page, guest2);
  });
  
  await test.step("Гость2: ищет хоста в каталоге по навыку и открывает карточку хоста", async () => {
    await normis2BookingPage.filterCatalog(skillTag);
    await normis2BookingPage.catalogCard.filter({ hasText: host.name }).click();
  });

  await test.step("Гость2: Видит имя хоста", async () => {
    await expect(normis2BookingPage.personName).toHaveText(host.name);
  });

  await test.step("Гость2: кликает по дню и времени в календаре слотов", async () => {
    await openBookingModal(normis2Page);
  });
  
  await test.step("Гость: подтверждает бронирование в модалке", async () => {
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

  await test.step("Гость2: пытается забронировать тот же слот вторым", async () => {
    await normis2BookingPage.bookingConfirmButton.click();
  });

  await test.step("Гость2: Видит ошибку", async () => {
    const success2 = normis2BookingPage.bookingConfirmSuccess;
    const error2 = normis2BookingPage.bookingConfirmError;

    await expect(success2.or(error2)).toBeVisible({ timeout: 15_000 });

    // Полярность наоборот относительно гостя 1: ошибка — ожидаемый результат
    if (await success2.isVisible().catch(() => false)) {
      throw new Error("Слот должен был быть занят, но бронирование прошло успешно");
    }
    await expect(error2).toBeVisible();
  });

  await test.step("Гость: видит бронирование в разделе «Мои встречи»", async () => {
    await expect(async () => {
      await normisPage.goto("/pomidorqa/bookings");
      const card = normisBookingPage.bookingsCardName;
      await expect(card).toHaveText(host.name);
    }).toPass({ timeout: 10_000 });
  });

  await test.step("Хост: тоже видит это бронирование в своих «Мои встречи»", async () => {
    await expect(async () => {
      await hostPage.goto("/pomidorqa/bookings");
      const card = hostBookingPage.bookingsCardName;
      await expect(card).toHaveText(guest.name);
    }).toPass({ timeout: 10_000 });
  });

  await hostContext.close();
  await normisContext.close();
  await normis2Context.close();
  });
