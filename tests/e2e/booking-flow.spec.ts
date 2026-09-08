import { test, expect } from "@playwright/test";
import { makeUser, registerUser } from "../helpers/user";
import { ProfilePage } from "../pages/profile-page";
import { BookingPage } from "../pages/booking-page";

// E2E-уровень пирамиды: реальный браузер на живом стенде aiqa.su/pomidorqa.
// После ДЗ Урока 4: guest2 открывает тот же слот и должен увидеть ошибку.
// Урок 10, ⭐: регистрация — в helpers/user.ts, страницы — в Page Object'ах
// (ProfilePage, BookingPage). В спеке шаги, expect и логика гонки; локаторов нет.
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

  const hostProfile = new ProfilePage(hostPage);
  const hostBooking = new BookingPage(hostPage);
  const guestBooking = new BookingPage(guestPage);
  const guest2Booking = new BookingPage(guest2Page);

  const tomorrow = new Date(Date.now() + 24 * 60 * 60 * 1000);
  const slotDate = tomorrow.toISOString().slice(0, 10);

  await test.step("Хост: регистрируется в PomidorQA", async () => {
    await registerUser(hostPage, host);
  });

  await test.step('Хост: открывает профиль и добавляет навык «могу помочь»', async () => {
    await hostProfile.open();
    await hostProfile.addSkill(skillTag, "can_help");
  });

  await test.step("Навык появился в блоке «могу помочь»", async () => {
    await expect(hostProfile.canHelpSkills).toContainText(skillTag);
  });

  await test.step("Хост: открывает слоты и добавляет свободный слот на завтра", async () => {
    await hostBooking.openSlots();
    await hostBooking.addSlot(slotDate, "12:00");
  });

  await test.step("Слот появился в списке", async () => {
    await expect(hostBooking.slotsCard.first()).toBeVisible();
  });

  await test.step("Гость: регистрируется отдельным аккаунтом", async () => {
    await registerUser(guestPage, guest);
  });

  await test.step("Гость: ищет хоста в каталоге по навыку", async () => {
    await guestBooking.searchInCatalog(skillTag);
  });

  await test.step("В каталоге появилась карточка хоста", async () => {
    await expect(guestBooking.personCardByName(host.name)).toBeVisible();
  });

  await test.step("Гость: открывает карточку хоста", async () => {
    await guestBooking.openPersonCard(host.name);
  });

  await test.step("Карточка хоста открыта", async () => {
    await expect(guestBooking.personName).toHaveText(host.name);
  });

  await test.step("Гость: выбирает день и время в календаре слотов", async () => {
    await expect(async () => {
      await guestBooking.ensureCalendarLoaded();
    }).toPass({ timeout: 10_000 });
    await guestBooking.selectFirstSlot();
  });

  await test.step("Открылся диалог подтверждения брони", async () => {
    await expect(guestBooking.confirmDialog).toBeVisible();
  });

  // Важно для разбора ДЗ 4: модалку guest2 открываем ДО confirm у guest.
  // Пока слот в UI ещё свободен — оба «человек открыл и отошёл».
  await test.step("Гость2: регистрируется отдельным аккаунтом", async () => {
    await registerUser(guest2Page, guest2);
  });

  await test.step("Гость2: ищет хоста в каталоге по навыку", async () => {
    await guest2Booking.searchInCatalog(skillTag);
  });

  await test.step("В каталоге появилась карточка хоста", async () => {
    await expect(guest2Booking.personCardByName(host.name)).toBeVisible();
  });

  await test.step("Гость2: открывает карточку хоста", async () => {
    await guest2Booking.openPersonCard(host.name);
  });

  await test.step("Карточка хоста открыта", async () => {
    await expect(guest2Booking.personName).toHaveText(host.name);
  });

  await test.step("Гость2: выбирает день и время в календаре слотов", async () => {
    await expect(async () => {
      await guest2Booking.ensureCalendarLoaded();
    }).toPass({ timeout: 10_000 });
    await guest2Booking.selectFirstSlot();
  });

  await test.step("У гостя2 тоже открыт диалог подтверждения брони", async () => {
    await expect(guest2Booking.confirmDialog).toBeVisible();
  });

  await test.step("Гость: подтверждает бронирование первым", async () => {
    await guestBooking.confirmBooking();
  });

  await test.step("Бронирование первого гостя прошло успешно", async () => {
    await expect(guestBooking.confirmSuccess).toBeVisible({ timeout: 15_000 });
  });

  await test.step("Гость2: подтверждает бронирование того же слота вторым", async () => {
    await guest2Booking.confirmBooking();
  });

  await test.step("Гость2 видит ошибку: слот уже занят", async () => {
    await expect(guest2Booking.confirmError).toBeVisible({ timeout: 15_000 });
  });

  await test.step("Гость: открывает «Мои встречи»", async () => {
    await expect(async () => {
      await guestBooking.openBookingsUntilCardVisible(host.name);
    }).toPass({ timeout: 10_000 });
  });

  await test.step("Встреча с хостом появилась у гостя в «Ближайших»", async () => {
    await expect(guestBooking.bookingCardByName(host.name)).toBeVisible();
  });

  await test.step("Хост: открывает свои «Мои встречи»", async () => {
    await expect(async () => {
      await hostBooking.openBookingsUntilCardVisible(guest.name);
    }).toPass({ timeout: 10_000 });
  });

  await test.step("Встреча с гостем появилась у хоста в «Ближайших»", async () => {
    await expect(hostBooking.bookingCardByName(guest.name)).toBeVisible();
  });

  await hostContext.close();
  await guestContext.close();
  await guest2Context.close();
});
