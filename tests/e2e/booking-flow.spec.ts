import { test, expect } from "@playwright/test";
import { makeUser, registerUser } from "../helpers/user";
import { ProfilePage } from "../pages/profile-page";
import { BookingPage } from "../pages/booking-page";

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

  const hostProfile = new ProfilePage(hostPage);
  const hostBooking = new BookingPage(hostPage);
  const guestBooking = new BookingPage(guestPage);
  const guest2Booking = new BookingPage(guest2Page);

  await test.step("Хост: регистрируется в PomidorQA", async () => {
    await registerUser(hostPage, host);
  });

  await test.step("Хост: добавляет навык «могу помочь» в профиле", async () => {
    const skillType = "can_help";

    await hostProfile.goto();
    await hostProfile.addSkill(skillTag, skillType);
    await expect(hostProfile.canHelpSkills).toContainText(skillTag);
  });

  await test.step("Хост: добавляет свободный слот на завтра", async () => {
    await hostBooking.gotoSlots();
    await hostBooking.addSlot();
    await expect(hostBooking.slotsCard.first()).toBeVisible();
  });

  await test.step("Гость: регистрируется отдельным аккаунтом", async () => {
    await registerUser(guestPage, guest);
  });

  await test.step("Гость: ищет хоста в каталоге по навыку (сценарий 9)", async () => {
    await guestBooking.fillFilter(skillTag);
    await expect(
      guestBooking.catalogCard.filter({ hasText: host.name })
    ).toBeVisible();
  });

  await test.step("Гость: открывает карточку хоста", async () => {
    await guestBooking.openCard(host.name);
    await expect(guestBooking.personName).toHaveText(host.name);
  });

  await test.step("Гость: проверяет наличие слотов в календаре", async () => {
    await expect(async () => {
      await guestBooking.getChip();
      await expect(guestBooking.bookingCalendarDay.first()).toBeVisible();
    }).toPass({ timeout: 15_000 });
  });

  await test.step("Гость: кликает по дню в календаре слотов", async () => {
    await guestBooking.selectFirstDay();
  });

  await test.step("Гость: проверяет, что время слота стало доступно", async () => {
    await expect(guestBooking.bookingCalendarTime.first()).toBeVisible();
  });

  await test.step("Гость: кликает по времени слота", async () => {
    await guestBooking.selectFirstTime();
  });

  await test.step("Гость: проверяет, что появилась модалка подтверждения", async () => {
    await expect(guestBooking.bookingConfirmDialog).toBeVisible();
  });

  await test.step("Гость2: регистрируется и тоже открывает окно бронирования на тот же слот", async () => {
    await registerUser(guest2Page, guest2);

    await guest2Booking.fillFilter(skillTag);
    await guest2Booking.openCard(host.name);
    await expect(guest2Booking.personName).toHaveText(host.name);

    await expect(async () => {
      await guest2Booking.getChip();
      await expect(guest2Booking.bookingCalendarDay.first()).toBeVisible();
    }).toPass({ timeout: 15_000 });

    await guest2Booking.selectFirstDay();
    await expect(guest2Booking.bookingCalendarTime.first()).toBeVisible();
    await guest2Booking.selectFirstTime();
    await expect(guest2Booking.bookingConfirmDialog).toBeVisible();
  });

  await test.step("Гость: подтверждает бронирование первым — успех", async () => {
    const success = guestBooking.bookingConfirmSuccess;
    const error = guestBooking.bookingConfirmError;

    await guestBooking.confirmBooking();
    await expect(success.or(error)).toBeVisible({ timeout: 15_000 });
    if (await error.isVisible().catch(() => false)) {
      throw new Error(`Бронирование не удалось: ${await error.textContent()}`);
    }
  });

  await test.step("Гость2: пытается забронировать тот же слот вторым — видит ошибку", async () => {
    const success2 = guest2Booking.bookingConfirmSuccess;
    const error2 = guest2Booking.bookingConfirmError;

    await guest2Booking.confirmBooking();

    await expect(success2.or(error2)).toBeVisible({ timeout: 15_000 });

    if (await success2.isVisible().catch(() => false)) {
      throw new Error(
        "Слот должен был быть занят, но бронирование прошло успешно"
      );
    }

    await expect(error2).toBeVisible();
  });

  await test.step("Гость: видит бронирование в разделе «Мои встречи»", async () => {
    await expect(async () => {
      await guestBooking.gotoBooking();
      const card = guestBooking.bookingsCardName;
      await expect(card).toHaveText(host.name);
    }).toPass({ timeout: 15_000 });
  });

  await test.step("Хост: тоже видит это бронирование в своих «Мои встречи»", async () => {
    await expect(async () => {
      await hostBooking.gotoBooking();
      const card = hostBooking.bookingsCardName;
      await expect(card).toHaveText(guest.name);
    }).toPass({ timeout: 15_000 });
  });

  await hostContext.close();
  await guestContext.close();
  await guest2Context.close();
});
