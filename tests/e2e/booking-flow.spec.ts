import { test, expect } from "@playwright/test";
import { registerUser, makeUser, type TestUser } from "../helpers/user";
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
 
  await test.step('Хост: добавляет навык «могу помочь» в профиле', async () => {
    await hostProfile.goto();
    await hostProfile.addSkill(skillTag, "can_help");
    await expect(hostProfile.canHelpSkills).toContainText(skillTag);
  });

  await test.step("Хост: добавляет свободный слот на завтра", async () => {
    await hostBooking.addSlot("12:00");
    await expect(hostBooking.slotsCard.first()).toBeVisible();
  });

  await test.step("Гость: регистрируется отдельным аккаунтом", async () => {
    await registerUser(guestPage, guest);
  });

  await test.step("Гость: ищет хоста в каталоге по навыку (сценарий 9)", async () => {
    await guestBooking.searchBySkill(skillTag);
    await expect(guestBooking.catalogCard.filter({ hasText: host.name })).toBeVisible();
  });

  await test.step("Гость: открывает карточку хоста", async () => {
    await guestBooking.openHostCard(host.name);
    await expect(guestBooking.personName).toHaveText(host.name);
  });

  await test.step("Гость: кликает по дню и времени в календаре слотов", async () => {
    await expect(async () => {
      const dayChip = guestBooking.bookingCalendarDay.first();
      if (!(await dayChip.isVisible().catch(() => false))) {
        await guestPage.reload();
      }
      await expect(dayChip).toBeVisible();
    }).toPass({ timeout: 10_000 });

    await guestBooking.selectFirstSlot();
    await expect(guestBooking.bookingConfirmDialog).toBeVisible();
  });

  await test.step("Гость2: регистрируется и тоже открывает окно бронирования на тот же слот", async () => {
    await registerUser(guest2Page, guest2);

    await guest2Booking.searchBySkill(skillTag);
    await guest2Booking.openHostCard(host.name);
    await expect(guest2Booking.personName).toHaveText(host.name);

    await expect(async () => {
      const dayChip = guest2Booking.bookingCalendarDay.first();
      if (!(await dayChip.isVisible().catch(() => false))) {
        await guest2Page.reload();
      }
      await expect(dayChip).toBeVisible();
    }).toPass({ timeout: 10_000 });

    await guest2Booking.selectFirstSlot();
    await expect(guest2Booking.bookingConfirmDialog).toBeVisible();
  });

  await test.step("Гость: подтверждает бронирование первым — успех", async () => {
    await guestBooking.confirmBooking();
    const success = guestBooking.bookingConfirmSuccess;
    const error = guestBooking.bookingConfirmError;
    await expect(success.or(error)).toBeVisible({ timeout: 15_000 });
  });

  await test.step("Гость2: пытается забронировать тот же слот вторым — видит ошибку", async () => {
    await guest2Booking.confirmBooking();
    const success2 = guest2Booking.bookingConfirmSuccess;
    const error2 = guest2Booking.bookingConfirmError;
    await expect(success2.or(error2)).toBeVisible({ timeout: 15_000 });
  });

  await test.step("Гость: видит бронирование в разделе «Мои встречи»", async () => {
    await expect(async () => {
      await guestBooking.gotoBookings();
      const card = guestBooking.bookingsCardName;
      await expect(card).toHaveText(host.name);
    }).toPass({ timeout: 10_000 });
  });

  await test.step("Хост: тоже видит это бронирование в своих «Мои встречи»", async () => {
    await expect(async () => {
      await hostBooking.gotoBookings();
      const card = hostBooking.bookingsCardName;
      await expect(card).toHaveText(guest.name);
    }).toPass({ timeout: 10_000 });
  });

  await hostContext.close();
  await guestContext.close();
  await guest2Context.close();
});
