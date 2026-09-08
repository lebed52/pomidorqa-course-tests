import { test, expect } from "@playwright/test";
import { makeUser, registerUser } from "../helpers/user";
import { ProfilePage } from "../pages/ProfilePage";
import { BookingPage } from "../pages/BookingPage";

// E2E-уровень пирамиды: реальный браузер на живом стенде aiqa.su/pomidorqa.
// После ДЗ Урока 4: guest2 открывает тот же слот и должен увидеть ошибку.
// host/guest уже через registerUser; регистрация guest2 пока инлайн — это заготовка к ДЗ Урока 5.
//POMIDORQA_BASE_URL=http://localhost:3000 npx playwright test --project=e2e tests/e2e/booking-flow.spec.ts

test.describe('Основной путь + гонка за слот: регистрация → навык → слот → поиск в каталоге → бронирование → «Мои встречи» у обоих → второй гость видит ошибку', () => {
  test ('основной путь + гонка за слот', async ({ browser }) => {
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


  await test.step("Хост: регистрируется в PomidorQA", async () => {
    await registerUser(hostPage, host);
  });
 
  await test.step('Хост: добавляет навык «могу помочь» в профиле', async () => {
    await hostProfile.goto();
    await hostProfile.addSkill(skillTag, "can_help")
  });

  await test.step('Хост: проверяет наличие навыка «могу помочь» в профиле', async () => {
    await expect(hostProfile.canHelpSkills).toContainText(skillTag);
  });

  await test.step("Хост: добавляет свободный слот на завтра", async () => {
    await hostBooking.gotoSlots()
    await hostBooking.addSlot()
  });

  await test.step("Хост: проверяет наличие свободного слота на завтра", async () => {
    await expect(hostBooking.slotsCard.first()).toBeVisible();
  });

  await test.step("Гость: регистрируется отдельным аккаунтом", async () => {
    await registerUser(guestPage, guest);
  });

  await test.step("Гость: ищет хоста в каталоге по навыку (сценарий 9)", async () => {
    await guestBooking.searchBySkill(skillTag)
  });

  await test.step("Гость: проверяет карточку хоста в каталоге", async () => {
    await expect(guestBooking.catalogCard.filter({ hasText: host.name })).toBeVisible();
  });

  await test.step("Гость: открывает карточку хоста", async () => {
    await guestBooking.openCard(host.name)
  });

  await test.step("Гость: проверяет наличие имени хоста в карточке хоста", async () => {
    await expect(guestBooking.personName).toHaveText(host.name);
  });

  await test.step("Гость: кликает по дню и времени в календаре слотов", async () => {
    await guestBooking.selectSlot();
  });

  await test.step("Гость: проверяет наличие диалога подтверждения бронирования", async () => {
    await expect(guestBooking.bookingConfirmDialog).toBeVisible();
  });

  // Важно для разбора ДЗ 4: модалку guest2 открываем ДО confirm у guest.
  // Пока слот в UI ещё свободен — оба «человек открыл и отошёл».
  await test.step("Гость2: регистрируется и тоже открывает карточку хоста на тот же слот", async () => {
    await registerUser(guest2Page, guest2);
    await guest2Booking.searchBySkill(skillTag)
    await guest2Booking.openCard(host.name);
  });

  await test.step("Гость2: проверяет наличие имени хоста в карточке", async () => {
    await expect(guest2Booking.personName).toHaveText(host.name);
  });

  await test.step("Гость2: выбирает слот в карточке", async () => {
    await guest2Booking.selectSlot()
  });

  await test.step("Гость2: проверяет наличие диалога подтверждения бронирования", async () => {
    await expect(guest2Booking.bookingConfirmDialog).toBeVisible();
  });

  await test.step("Гость: подтверждает бронирование первым — успех", async () => {
    await guestBooking.bookingConfirm()
  });

  await test.step("Гость2: пытается забронировать тот же слот вторым — видит ошибку", async () => {
    await guest2Booking.bookingFail();
  });

  await test.step("Гость2: проверяет отображение ошибки подтверждения", async () => {
    await expect(guest2Booking.bookingConfirmError).toBeVisible();
  });

  await test.step("Гость: переходит в «Мои встречи»", async () => {
    await guestBooking.gotoBookings();
  });

  await test.step("Гость: видит бронирование в разделе «Мои встречи»", async () => {
    await expect(async () => {
      const card = guestBooking.bookingsCardName;
      await expect(card).toHaveText(host.name);
    }).toPass({ timeout: 10_000 });
  });

  await test.step("Хост: переходит в «Мои встречи»", async () => {
    await hostBooking.gotoBookings();
  });

  await test.step("Хост: тоже видит это бронирование в своих «Мои встречи»", async () => {
    await expect(async () => {
      const card = hostBooking.bookingsCardName;
      await expect(card).toHaveText(guest.name);
    }).toPass({ timeout: 10_000 });
  });

  await hostContext.close();
  await guestContext.close();
  await guest2Context.close();
});
});