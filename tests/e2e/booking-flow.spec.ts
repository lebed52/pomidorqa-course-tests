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

  await test.step("Хост: регистрируется в PomidorQA", async () => {
    await registerUser(hostPage, host);
  });
 
  await test.step('Хост: добавляет навык «могу помочь» в профиле', async () => {
    let profilePage = new ProfilePage(hostPage);
    const skillType = "can_help"

    await profilePage.goto();
    await profilePage.addSkill(skillTag, skillType);
    await expect(profilePage.skillChip).toContainText(skillTag);
  });

  await test.step("Хост: добавляет свободный слот на завтра", async () => {
    let bookingPage = new BookingPage(hostPage);

    await bookingPage.gotoSlots();
    await bookingPage.addSlot()
    await expect(bookingPage.slotsCard.first()).toBeVisible();
  });

  await test.step("Гость: регистрируется отдельным аккаунтом", async () => {
    await registerUser(guestPage, guest);
  });

  await test.step("Гость: ищет хоста в каталоге по навыку (сценарий 9)", async () => {
    let bookingPage = new BookingPage(guestPage);

    await bookingPage.fillFilter(skillTag);
    await expect(bookingPage.catalogCard.filter({ hasText: host.name })).toBeVisible();
  });

  await test.step("Гость: открывает карточку хоста", async () => {
    let bookingPage = new BookingPage(guestPage);

    await bookingPage.openCard(host.name);
    await expect(bookingPage.personName).toHaveText(host.name);
  });

  await test.step("Гость: кликает по дню и времени в календаре слотов", async () => {
    let bookingPage = new BookingPage(guestPage);

    await expect(async () => {
      await bookingPage.getChip()
      await expect(bookingPage.bookingCalendarDay).toBeVisible();
    }).toPass({ timeout: 10_000 });

    await bookingPage.selectFirstSlot()
    await expect(bookingPage.bookingConfirmDialog).toBeVisible();
  });

  await test.step("Гость2: регистрируется и тоже открывает окно бронирования на тот же слот", async () => {
    let bookingPage = new BookingPage(guest2Page);

    await registerUser(guest2Page, guest2);

    await bookingPage.fillFilter(skillTag);
    await bookingPage.openCard(host.name);
    await expect(bookingPage.personName).toHaveText(host.name);

    await expect(async () => {
      await bookingPage.getChip();
      await expect(bookingPage.bookingCalendarDay.first()).toBeVisible();
    }).toPass({ timeout: 10_000 });

    await bookingPage.selectFirstSlot()
    await expect(bookingPage.bookingConfirmDialog).toBeVisible();
  });

  await test.step("Гость: подтверждает бронирование первым — успех", async () => {
    let bookingPage = new BookingPage(guestPage);

    const success = bookingPage.bookingConfirmSuccess;
    const error = bookingPage.bookingConfirmError;

    await bookingPage.confirmBooking();
    await expect(success.or(error)).toBeVisible({ timeout: 15_000 });
    if (await error.isVisible().catch(() => false)) {
      throw new Error(`Бронирование не удалось: ${await error.textContent()}`);
    }
  });

  await test.step("Гость2: пытается забронировать тот же слот вторым — видит ошибку", async () => {
    let bookingPage = new BookingPage(guest2Page);
    const success2 = bookingPage.bookingConfirmSuccess;
    const error2 = bookingPage.bookingConfirmError;

    await bookingPage.confirmBooking();

    await expect(success2.or(error2)).toBeVisible({ timeout: 15_000 });

    if (await success2.isVisible().catch(() => false)) {
      throw new Error("Слот должен был быть занят, но бронирование прошло успешно");
    }

    await expect(error2).toBeVisible();
  });

  await test.step("Гость: видит бронирование в разделе «Мои встречи»", async () => {
    let bookingPage = new BookingPage(guestPage);

    await expect(async () => {
      await bookingPage.gotoBooking();
      const card = bookingPage.bookingsCardName;
      await expect(card).toHaveText(host.name);
    }).toPass({ timeout: 10_000 });
  });

  await test.step("Хост: тоже видит это бронирование в своих «Мои встречи»", async () => {
    let bookingPage = new BookingPage(hostPage);

    await expect(async () => {
      await bookingPage.gotoBooking();
      const card = bookingPage.bookingsCardName;
      await expect(card).toHaveText(guest.name);
    }).toPass({ timeout: 10_000 });
  });

  await hostContext.close();
  await guestContext.close();
  await guest2Context.close();
});
