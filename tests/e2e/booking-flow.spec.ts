import { test } from "@playwright/test";
import { makeUser, registerUser } from "./helpers/user";
import { BookingPage } from "./pages/booking-page";

// E2E-уровень пирамиды: реальный браузер на живом стенде aiqa.su/pomidorqa.
// После ДЗ Урока 4: guest2 открывает тот же слот и должен увидеть ошибку.
//POMIDORQA_BASE_URL=http://localhost:3000 npx playwright test --project=e2e tests/e2e/booking-flow.spec.ts

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
  const hostPage = await hostContext.newPage();
  const guestPage = await guestContext.newPage();
  const guest2Page = await guest2Context.newPage();

  const hostApp = new BookingPage(hostPage);
  const guestApp = new BookingPage(guestPage);
  const guest2App = new BookingPage(guest2Page);

  // Сценарий с тремя браузерами и ожиданиями слотов не укладывается в дефолтные 30 секунд
  test.setTimeout(180_000);

  await test.step("Хост: регистрируется в PomidorQA", async () => {
    await registerUser(hostPage, host);
  });

  await test.step('Хост: добавляет навык «могу помочь» в профиле', async () => {
    await hostApp.addCanHelpSkill(skillTag);
  });

  await test.step("Хост: добавляет свободный слот на завтра", async () => {
    await hostApp.addSlotTomorrow("12:00");
  });

  await test.step("Гость: регистрируется отдельным аккаунтом", async () => {
    await registerUser(guestPage, guest);
  });

  await test.step("Гость: ищет хоста в каталоге по навыку (сценарий 9)", async () => {
    await guestApp.findHostBySkill(skillTag, host.name);
  });

  await test.step("Гость: открывает карточку хоста", async () => {
    await guestApp.openHostCard(host.name);
  });

  await test.step("Гость: кликает по дню и времени в календаре слотов", async () => {
    await guestApp.openFirstSlot();
  });

  // Важно для разбора ДЗ 4: модалку guest2 открываем ДО confirm у guest.
  // Пока слот в UI ещё свободен — оба «человек открыл и отошёл».
  await test.step("Гость2: регистрируется и тоже открывает окно бронирования на тот же слот", async () => {
    await registerUser(guest2Page, guest2);

    await guest2App.findHostBySkill(skillTag, host.name);
    await guest2App.openHostCard(host.name);
    await guest2App.openFirstSlot();
  });

  await test.step("Гость: подтверждает бронирование первым — успех", async () => {
    const { outcome, message } = await guestApp.confirmBooking();
    if (outcome === "error") {
      throw new Error(`Бронирование не удалось: ${message}`);
    }
  });

  await test.step("Гость2: пытается забронировать тот же слот вторым — видит ошибку", async () => {
    const { outcome } = await guest2App.confirmBooking();
    // Полярность наоборот относительно гостя 1: ошибка — ожидаемый результат
    if (outcome === "success") {
      throw new Error("Слот должен был быть занят, но бронирование прошло успешно");
    }
  });

  await test.step("Гость: видит бронирование в разделе «Мои встречи»", async () => {
    await guestApp.expectUpcomingBookingWithName(host.name);
  });

  await test.step("Хост: тоже видит это бронирование в своих «Мои встречи»", async () => {
    await hostApp.expectUpcomingBookingWithName(guest.name);
  });

  await hostContext.close();
  await guestContext.close();
  await guest2Context.close();
});
