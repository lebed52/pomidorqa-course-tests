import { test, expect } from "@playwright/test";
import { makeUser, registerUser } from "../helpers/user";
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

  const hostBookingPage = new BookingPage(hostPage);
  const guestBookingPage = new BookingPage(guestPage);
  const guest2BookingPage = new BookingPage(guest2Page);

  await test.step("Хост: регистрируется в PomidorQA", async () => {
    await registerUser(hostPage, host);
  });

  await test.step("Хост: добавляет навык «могу помочь» в профиле", async () => {
    await hostBookingPage.openProfile();
    await hostBookingPage.addCanHelpSkill(skillTag);
    await expect(hostBookingPage.profileCanHelpSkills).toContainText(skillTag);
  });

  await test.step("Хост: добавляет свободный слот на завтра", async () => {
    await hostBookingPage.openSlots();

    const tomorrow = new Date(Date.now() + 24 * 60 * 60 * 1000);
    const date = tomorrow.toISOString().slice(0, 10);

    await hostBookingPage.addSlot(date, "12:00");
    await expect(hostBookingPage.slotsCards.first()).toBeVisible();
  });

  await test.step("Гость: регистрируется отдельным аккаунтом", async () => {
    await registerUser(guestPage, guest);
  });

  await test.step("Гость: ищет хоста в каталоге по навыку", async () => {
    await guestBookingPage.findPersonBySkill(skillTag);
    await expect(guestBookingPage.personCard(host.name)).toBeVisible();
  });

  await test.step("Гость: открывает карточку хоста", async () => {
    await guestBookingPage.openPersonCard(host.name);
    await expect(guestBookingPage.personName).toHaveText(host.name);
  });

  await test.step("Гость: выбирает день и время", async () => {
    await guestBookingPage.waitForCalendarSlot();
    await guestBookingPage.chooseFirstSlot();
    await guestBookingPage.expectBookingDialogVisible();
  });

  await test.step("Гость2: регистрируется и открывает тот же слот", async () => {
    await registerUser(guest2Page, guest2);

    await guest2BookingPage.findPersonBySkill(skillTag);
    await guest2BookingPage.openPersonCard(host.name);
    await expect(guest2BookingPage.personName).toHaveText(host.name);

    await guest2BookingPage.waitForCalendarSlot();
    await guest2BookingPage.chooseFirstSlot();
    await guest2BookingPage.expectBookingDialogVisible();
  });

  await test.step("Гость: подтверждает бронирование первым — успех", async () => {
    await guestBookingPage.confirmBookingExpectSuccess();
  });

  await test.step("Гость2: получает ошибку на занятом слоте", async () => {
    await guest2BookingPage.confirmBookingExpectError();
  });

  await test.step("Гость: видит бронирование в «Мои встречи»", async () => {
    await guestBookingPage.expectUpcomingBookingWithName(host.name);
  });

  await test.step("Хост: видит гостя в «Мои встречи»", async () => {
    await hostBookingPage.expectUpcomingBookingWithName(guest.name);
  });

  await hostContext.close();
  await guestContext.close();
  await guest2Context.close();
});