import { test, expect, type BrowserContext } from "@playwright/test";
import { makeUser, registerUserViaApi, cleanupUsersViaApi } from "../helpers/user";
import { ProfilePage } from "../pages/profile-page";
import { BookingPage } from "../pages/booking-page";

// E2E-уровень пирамиды: реальный браузер на живом стенде aiqa.su/pomidorqa.
// Регистрация всех трёх участников — через API (helpers/user.ts), без UI-формы: так быстрее,
// а форму регистрации саму по себе проверяют login-error.spec.ts и другие тесты, не этот сценарий.
// Сессионная cookie от API-ответа попадает в тот же browser-контекст через context.request —
// страницы сразу открываются уже авторизованными, дальше сценарий идёт по UI как раньше.
// Удаление всех трёх — в afterEach (не шагом внутри теста): сработает и если тест упадёт
// на середине, иначе тестовые аккаунты будут копиться в базе прода.
//POMIDORQA_BASE_URL=http://localhost:3000 npx playwright test --project=e2e tests/e2e/booking-flow.spec.ts

// Тест сам кладёт сюда свои контексты сразу после их создания — afterEach не знает
// заранее, сколько их будет и какие, но обязан их закрыть и удалить пользователей
// в любом случае: и когда тест прошёл, и когда упал на каком-то шаге.
let scenarioContexts: BrowserContext[] = [];

test.afterEach(async () => {
  await cleanupUsersViaApi(scenarioContexts);
  scenarioContexts = [];
});

test("основной путь + гонка за слот: регистрация → навык → слот → поиск в каталоге → бронирование → «Мои встречи» у обоих → второй гость видит ошибку", async ({
  browser,
}) => {
  const runId = Date.now();
  const skillTag = `Playwright-demo-${runId}`;
  const host = makeUser("host", runId);
  const guest = makeUser("guest", runId);
  const guest2 = makeUser("guest2", runId);

  // Три независимых аккаунта = три независимых браузерных контекста
  const hostContext = await browser.newContext();
  const guestContext = await browser.newContext();
  const guest2Context = await browser.newContext();
  scenarioContexts = [hostContext, guestContext, guest2Context];

  const hostPage = await hostContext.newPage();
  const guestPage = await guestContext.newPage();
  const guest2Page = await guest2Context.newPage();

  const hostProfile = new ProfilePage(hostPage);
  const hostBooking = new BookingPage(hostPage);
  const guestBooking = new BookingPage(guestPage);
  const guest2Booking = new BookingPage(guest2Page);

  await test.step("Хост: регистрируется через API", async () => {
    await registerUserViaApi(hostContext.request, host);
  });

  await test.step('Хост: добавляет навык «могу помочь» в профиле', async () => {
    await hostProfile.goto();
    await hostProfile.addSkill(skillTag, "can_help");
    await expect(hostProfile.canHelpSkills).toContainText(skillTag);
  });

  await test.step("Хост: добавляет свободный слот на завтра", async () => {
    await hostBooking.gotoSlots();
    const tomorrow = new Date(Date.now() + 24 * 60 * 60 * 1000);
    const date = tomorrow.toISOString().slice(0, 10);
    await hostBooking.addSlot(date, "12:00");
    await expect(hostBooking.slotsCard.first()).toBeVisible();
  });

  await test.step("Гость: регистрируется отдельным аккаунтом через API", async () => {
    await registerUserViaApi(guestContext.request, guest);
  });

  await test.step("Гость: ищет хоста в каталоге по навыку (сценарий 9)", async () => {
    // Раньше сюда попадали через редирект после сабмита формы регистрации.
    // API-регистрация браузер никуда не переводит — открываем каталог сами.
    await guestBooking.gotoCatalog();
    await guestBooking.searchBySkill(skillTag);
    await expect(guestBooking.personCard(host.name)).toBeVisible();
  });

  await test.step("Гость: открывает карточку хоста", async () => {
    await guestBooking.openPerson(host.name);
    await expect(guestBooking.personName).toHaveText(host.name);
  });

  await test.step("Гость: кликает по дню и времени в календаре слотов", async () => {
    await guestBooking.selectFirstAvailableSlot();
    await expect(guestBooking.confirmDialog).toBeVisible();
  });

  // Важно для разбора ДЗ 4: модалку guest2 открываем ДО confirm у guest.
  // Пока слот в UI ещё свободен — оба «человек открыл и отошёл».
  await test.step("Гость2: регистрируется через API и тоже открывает окно бронирования на тот же слот", async () => {
    await registerUserViaApi(guest2Context.request, guest2);

    await guest2Booking.gotoCatalog();
    await guest2Booking.searchBySkill(skillTag);
    await guest2Booking.openPerson(host.name);
    await expect(guest2Booking.personName).toHaveText(host.name);

    await guest2Booking.selectFirstAvailableSlot();
    await expect(guest2Booking.confirmDialog).toBeVisible();
  });

  await test.step("Гость: подтверждает бронирование первым — успех", async () => {
    await guestBooking.confirmBooking();
    const success = guestBooking.confirmSuccess;
    const error = guestBooking.confirmError;
    await expect(success.or(error)).toBeVisible({ timeout: 15_000 });
    if (await error.isVisible().catch(() => false)) {
      throw new Error(`Бронирование не удалось: ${await error.textContent()}`);
    }
  });

  await test.step("Гость2: пытается забронировать тот же слот вторым — видит ошибку", async () => {
    await guest2Booking.confirmBooking();

    const success2 = guest2Booking.confirmSuccess;
    const error2 = guest2Booking.confirmError;
    await expect(success2.or(error2)).toBeVisible({ timeout: 15_000 });

    // Полярность наоборот относительно гостя 1: ошибка — ожидаемый результат
    if (await success2.isVisible().catch(() => false)) {
      throw new Error("Слот должен был быть занят, но бронирование прошло успешно");
    }
    await expect(error2).toBeVisible();
  });

  await test.step("Гость: видит бронирование в разделе «Мои встречи»", async () => {
    await expect(async () => {
      await guestBooking.gotoBookings();
      await expect(guestBooking.upcomingCardName).toHaveText(host.name);
    }).toPass({ timeout: 10_000 });
  });

  await test.step("Хост: тоже видит это бронирование в своих «Мои встречи»", async () => {
    await expect(async () => {
      await hostBooking.gotoBookings();
      await expect(hostBooking.upcomingCardName).toHaveText(guest.name);
    }).toPass({ timeout: 10_000 });
  });
});
