import { test, expect } from "@playwright/test";
import { makeUser, registerUser } from "../helpers/user";
import { BookingPage } from "../pages/booking-page";
import { ProfilePage } from "../pages/profile-page";

test.describe("Бронирование: основной путь и гонка за слот", () => {
  test("основной путь + гонка за слот: регистрация → навык → слот → поиск в каталоге → бронирование → «Мои встречи» у обоих → второй гость видит ошибку", async ({
    browser,
  }) => {
    test.setTimeout(60_000);
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

    const hostBookingPage = new BookingPage(hostPage);
    const guestBookingPage = new BookingPage(guestPage);
    const guest2BookingPage = new BookingPage(guest2Page);
    const hostProfilePage = new ProfilePage(hostPage);

    await test.step("Хост: регистрируется в PomidorQA", async () => {
      await registerUser(hostPage, host);
    });

    await test.step("Хост: добавляет навык «могу помочь» в профиле", async () => {
      await hostProfilePage.open();
      await hostProfilePage.addCanHelpSkill(skillTag);
    });

    await test.step("Навык появился в блоке «могу помочь»", async () => {
      await expect(hostProfilePage.canHelpSkills).toContainText(skillTag);
    });

    await test.step("Хост: добавляет свободный слот на завтра", async () => {
      await hostBookingPage.goToSlots();

      const tomorrow = new Date(Date.now() + 24 * 60 * 60 * 1000);
      const date = tomorrow.toISOString().slice(0, 10);

      await hostBookingPage.addSlot(date, "12:00");
    });

    await test.step("Слот появился в списке", async () => {
      await expect(hostBookingPage.slotsCards.first()).toBeVisible();
    });

    await test.step("Гость: регистрируется отдельным аккаунтом", async () => {
      await registerUser(guestPage, guest);
    });

    await test.step("Гость: ищет хоста в каталоге по навыку", async () => {
      await guestBookingPage.findPersonBySkill(skillTag);
    });

    await test.step("Хост найден в каталоге", async () => {
      await expect(guestBookingPage.personCard(host.name)).toBeVisible();
    });

    await test.step("Гость: открывает карточку хоста", async () => {
      await guestBookingPage.openPersonCard(host.name);
    });

    await test.step("Открыта карточка нужного хоста", async () => {
      await expect(guestBookingPage.personName).toHaveText(host.name);
    });

    await test.step("Гость: ждёт появления свободного слота", async () => {
      await expect(guestBookingPage.calendarDayChip()).toBeVisible({ timeout: 10_000 });
    });

    await test.step("Гость: выбирает день и время", async () => {
      await guestBookingPage.selectFirstSlot();
    });

    await test.step("Гость: видит окно подтверждения бронирования", async () => {
      await expect(guestBookingPage.bookingConfirmDialog).toBeVisible();
    });

    await test.step("Гость2: регистрируется отдельным аккаунтом", async () => {
      await registerUser(guest2Page, guest2);
    });

    await test.step("Гость2: ищет хоста в каталоге по навыку", async () => {
      await guest2BookingPage.findPersonBySkill(skillTag);
    });

    await test.step("Гость2: видит карточку хоста", async () => {
      await expect(guest2BookingPage.personCard(host.name)).toBeVisible();
    });

    await test.step("Гость2: открывает карточку хоста", async () => {
      await guest2BookingPage.openPersonCard(host.name);
    });

    await test.step("Гость2: видит имя хоста в карточке", async () => {
      await expect(guest2BookingPage.personName).toHaveText(host.name);
    });

    await test.step("Гость2: ждёт появления свободного слота", async () => {
      await expect(guest2BookingPage.calendarDayChip()).toBeVisible({ timeout: 10_000 });
    });

    await test.step("Гость2: выбирает день и время", async () => {
      await guest2BookingPage.selectFirstSlot();
    });

    await test.step("Гость2: видит окно подтверждения бронирования", async () => {
      await expect(guest2BookingPage.bookingConfirmDialog).toBeVisible();
    });

    await test.step("Гость: подтверждает бронирование первым", async () => {
      await guestBookingPage.confirmBooking();
    });

    await test.step("Гость: видит успешное бронирование", async () => {
      await expect(guestBookingPage.bookingConfirmSuccess).toBeVisible({
        timeout: 15_000,
      });
    });

    await test.step("Гость2: подтверждает бронирование занятого слота", async () => {
      await guest2BookingPage.confirmBooking();
    });

    await test.step("Гость2: видит ошибку занятого слота", async () => {
      await expect(guest2BookingPage.bookingConfirmError).toBeVisible({
        timeout: 15_000,
      });
    });

    await test.step("Гость: открывает раздел «Мои встречи»", async () => {
      await guestBookingPage.openBookings();
    });

    await test.step("Гость: видит встречу с хостом", async () => {
      await expect(guestBookingPage.bookingCardName()).toHaveText(host.name, {
        timeout: 10_000,
      });
    });

    await test.step("Хост: открывает раздел «Мои встречи»", async () => {
      await hostBookingPage.openBookings();
    });

    await test.step("Хост: видит встречу с гостем", async () => {
      await expect(hostBookingPage.bookingCardName()).toHaveText(guest.name, {
        timeout: 10_000,
      });
    });

    await hostContext.close();
    await guestContext.close();
    await guest2Context.close();
  });
});