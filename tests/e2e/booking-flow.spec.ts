import { test, expect, type Page } from "@playwright/test";
import { makeUser, registerUser } from "../helpers/user";
import { ProfilePage } from "../pages/profile-page";
import { BookingPage } from "../pages/booking-page";

const slotDateInput = (page: Page) => page.locator('input[type="date"]');
const slotTimeInput = (page: Page) => page.locator('input[type="time"]');
const slotAddSubmit = (page: Page) => page.getByRole('button', { name: 'Добавить слот' });
const slotCard = (page: Page) => page.locator('[data-slot-status="free"]').first();

test("основной путь + гонка за слот", async ({ browser }) => {
  const runId = Date.now();
  const skillTag = `Playwright-demo-${runId}`;
  const tomorrow = new Date(Date.now() + 24 * 60 * 60 * 1000);
  const slotDate = tomorrow.toISOString().slice(0, 10);

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

  await test.step("Хост: регистрируется", async () => {
    await registerUser(hostPage, host);
  });

  await test.step("Хост: добавляет навык", async () => {
    await hostPage.goto("/pomidorqa/profile");
    await hostProfile.addSkill(skillTag);
    await expect(hostProfile.canHelpSkills()).toContainText(skillTag);
  });

  await test.step("Хост: добавляет слот на завтра в 12:00", async () => {
    await hostPage.goto("/pomidorqa/profile/slots");
    await slotDateInput(hostPage).fill(slotDate);
    await slotTimeInput(hostPage).fill("12:00");
    await slotAddSubmit(hostPage).click();
    await expect(slotCard(hostPage)).toBeVisible({ timeout: 15000 });
  });

  await test.step("Гость: регистрируется", async () => {
    await registerUser(guestPage, guest);
  });

  await test.step("Гость: находит хоста в каталоге", async () => {
    await guestBooking.searchBySkill(skillTag);
    await guestBooking.openHostCard(host.name);
  });

  await test.step("Гость: кликает по дню и времени в календаре слотов", async () => {
    await guestBooking.selectDayAndTime(slotDate);
  });

  await test.step("Гость2: регистрируется и тоже открывает окно бронирования на тот же слот", async () => {
    await registerUser(guest2Page, guest2);
    await guest2Booking.searchBySkill(skillTag);
    await guest2Booking.openHostCard(host.name);
    await guest2Booking.selectDayAndTime(slotDate);
  });

  await test.step("Гость: подтверждает бронирование первым — успех", async () => {
    await guestBooking.confirmBooking();
    const success = guestBooking.bookingSuccess();
    const error = guestBooking.bookingError();
    await expect(success.or(error)).toBeVisible({ timeout: 15000 });
    if (await error.isVisible().catch(() => false)) {
      throw new Error(`Бронирование не удалось: ${await error.textContent()}`);
    }
  });

  await test.step("Гость2: пытается забронировать тот же слот вторым — видит ошибку", async () => {
    await guest2Booking.confirmBooking();
    const success2 = guest2Booking.bookingSuccess();
    const error2 = guest2Booking.bookingError();
    await expect(success2.or(error2)).toBeVisible({ timeout: 15000 });
    if (await success2.isVisible().catch(() => false)) {
      throw new Error('Слот должен был быть занят, но бронирование прошло успешно');
    }
    await expect(error2).toBeVisible();
  });

  await test.step("Гость: видит бронирование в «Мои встречи»", async () => {
    await expect(async () => {
      await guestBooking.goToBookings();
      await expect(guestBooking.upcomingSection()).toBeVisible({ timeout: 5000 });
      await expect(guestBooking.upcomingSection().getByText(host.name)).toBeVisible({ timeout: 5000 });
    }).toPass({ timeout: 10000 });
  });

  await test.step("Хост: видит бронирование в «Мои встречи»", async () => {
    await expect(async () => {
      await hostBooking.goToBookings();
      await expect(hostBooking.upcomingSection()).toBeVisible({ timeout: 5000 });
      await expect(hostBooking.upcomingSection().getByText(guest.name)).toBeVisible({ timeout: 5000 });
    }).toPass({ timeout: 10000 });
  });

  await hostContext.close();
  await guestContext.close();
  await guest2Context.close();
});
