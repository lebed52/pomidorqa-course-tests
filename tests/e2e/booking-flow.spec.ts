import { test, expect } from "@playwright/test";
import { makeUser, registerUser } from "../helpers/user";
import { ProfilePage } from "../pages/profile-page";
import { SlotsPage } from "../pages/slots-page";
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
  const hostSlots = new SlotsPage(hostPage);
  const hostBookingsPage = new BookingPage(hostPage);

  const guestBookingPage = new BookingPage(guestPage);
  const guest2BookingPage = new BookingPage(guest2Page);

  await test.step("Хост: регистрируется в PomidorQA", async () => {
    await registerUser(hostPage, host);
  });

  await test.step("Хост: добавляет навык «могу помочь» в профиле", async () => {
    await hostProfile.goto();
    await hostProfile.addSkill(skillTag, "can_help");
    await expect(hostProfile.canHelpSkills).toContainText(skillTag);
  });

  await test.step("Хост: добавляет свободный слот на завтра", async () => {
    await hostSlots.goto();
    await hostSlots.addSlot("12:00");
    await expect(hostSlots.firstSlotCard).toBeVisible();
  });

  await test.step("Гость: регистрируется отдельным аккаунтом", async () => {
    await registerUser(guestPage, guest);
  });

  await test.step("Гость: находит и открывает карточку хоста в каталоге", async () => {
    await guestBookingPage.navigateToHostProfile(skillTag, host.name);
    await expect(guestBookingPage.getPersonCard(host.name)).toBeVisible();
    await expect(guestBookingPage.personHeading).toHaveText(host.name);
  });

  await test.step("Гость: кликает по дню и времени в календаре слотов", async () => {
    const dayChip = await guestBookingPage.ensureCalendarVisible();
    await expect(dayChip).toBeVisible();

    await guestBookingPage.selectFirstSlot();
    await expect(guestBookingPage.confirmDialog).toBeVisible();
  });

  await test.step("Гость2: регистрируется и тоже открывает окно бронирования на тот же слот", async () => {
    await registerUser(guest2Page, guest2);

    await guest2BookingPage.navigateToHostProfile(skillTag, host.name);
    await expect(guest2BookingPage.personHeading).toHaveText(host.name);

    const dayChip = await guest2BookingPage.ensureCalendarVisible();
    await expect(dayChip).toBeVisible();

    await guest2BookingPage.selectFirstSlot();
    await expect(guest2BookingPage.confirmDialog).toBeVisible();
  });

  await test.step("Гость: подтверждает бронирование первым — успех", async () => {
    await guestBookingPage.confirmBooking();

    const isSuccess = await guestBookingPage.waitForBookingStatus();
    if (!isSuccess) {
      const errorText = await guestBookingPage.errorAlert.textContent();
      throw new Error(`Бронирование не удалось: ${errorText}`);
    }
    await expect(guestBookingPage.successStatus).toBeVisible();
  });

  await test.step("Гость2: пытается забронировать тот же слот вторым — видит ошибку", async () => {
    await guest2BookingPage.confirmBooking();

    const isSuccess = await guest2BookingPage.waitForBookingStatus();
    if (isSuccess) {
      throw new Error(
        "Слот должен был быть занят, но бронирование у Guest2 прошло успешно",
      );
    }
    await expect(guest2BookingPage.errorAlert).toBeVisible();
  });

  await test.step("Гость: видит бронирование в разделе «Мои встречи»", async () => {
    await guestBookingPage.loadUpcomingMeetingsAndEnsureData(host.name);
    await expect(guestBookingPage.firstCardName).toHaveText(host.name);
  });

  await test.step("Хост: тоже видит это бронирование в своих «Мои встречи»", async () => {
    await hostBookingsPage.loadUpcomingMeetingsAndEnsureData(guest.name);
    await expect(hostBookingsPage.firstCardName).toHaveText(guest.name);
  });

  // Закрываем контексты в конце
  await hostContext.close();
  await guestContext.close();
  await guest2Context.close();
});
