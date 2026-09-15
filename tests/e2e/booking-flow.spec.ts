import { test, expect } from "@playwright/test";
import {
  loginUser,
  makeRandom,
  makeUser,
  prepareHost,
  registerUser,
  UTC_CONTEXT_OPTIONS,
} from "../helpers/user";
import {
  bookFirstSlot,
  expectBookingFails,
  expectBookingSucceeds,
  openBookingDialogForFirstSlot,
} from "../helpers/booking";
import { BookingPage } from "../pages/booking-page";

test("основной путь + гонка за слот: регистрация → навык → слот → поиск в каталоге → бронирование → «Мои встречи» у обоих → второй гость видит ошибку", async ({
  browser,
}) => {
  const runId = Date.now();
  const skillTag = makeRandom("Playwright-demo");
  const host = makeUser("host", runId);
  const guest = makeUser("guest", runId);
  const guest2 = makeUser("guest2", runId);

  const hostContext = await browser.newContext(UTC_CONTEXT_OPTIONS);
  const guestContext = await browser.newContext(UTC_CONTEXT_OPTIONS);
  const guest2Context = await browser.newContext(UTC_CONTEXT_OPTIONS);

  const hostPage = await hostContext.newPage();
  const guestPage = await guestContext.newPage();
  const guest2Page = await guest2Context.newPage();

  const hostBookingsPage = new BookingPage(hostPage);
  const guestBookingPage = new BookingPage(guestPage);
  const guest2BookingPage = new BookingPage(guest2Page);

  try {
    await test.step("Хост: регистрируется, добавляет навык и свободный слот на завтра", async () => {
      await prepareHost(hostPage, host, skillTag);
    });

    await test.step("Гость: регистрируется и открывает окно бронирования на первый слот", async () => {
      await registerUser(guestPage, guest);
      await openBookingDialogForFirstSlot(
        guestBookingPage,
        skillTag,
        host.name,
      );
    });

    await test.step("Гость2: регистрируется и открывает окно бронирования на тот же слот", async () => {
      await registerUser(guest2Page, guest2);
      await openBookingDialogForFirstSlot(
        guest2BookingPage,
        skillTag,
        host.name,
      );
    });

    await test.step("Гость: подтверждает бронирование первым — успех", async () => {
      await guestBookingPage.confirmBooking();
      await expectBookingSucceeds(guestBookingPage);
    });

    await test.step("Гость2: пытается забронировать тот же слот вторым — видит ошибку", async () => {
      await guest2BookingPage.confirmBooking();
      await expectBookingFails(guest2BookingPage);
    });

    await test.step("Гость: видит бронирование в разделе «Мои встречи»", async () => {
      await guestBookingPage.openUpcomingMeetings(host.name);
      await expect(
        guestBookingPage.upcomingBookingByParticipant(host.name),
      ).toBeVisible();
    });

    await test.step("Хост: тоже видит это бронирование в своих «Мои встречи»", async () => {
      await hostBookingsPage.openUpcomingMeetings(guest.name);
      await expect(
        hostBookingsPage.upcomingBookingByParticipant(guest.name),
      ).toBeVisible();
    });
  } finally {
    await hostContext.close();
    await guestContext.close();
    await guest2Context.close();
  }
});

test("вход с валидными данными: вернувшийся гость видит свою запланированную встречу", async ({
  browser,
}) => {
  const runId = Date.now();
  const skillTag = makeRandom("Playwright-demo");
  const host = makeUser("host", runId);
  const guest = makeUser("guest", runId);

  const hostContext = await browser.newContext(UTC_CONTEXT_OPTIONS);
  const guestContext = await browser.newContext(UTC_CONTEXT_OPTIONS);

  const returnedContext = await browser.newContext(UTC_CONTEXT_OPTIONS);
  let returnedBookingPage: BookingPage | null = null;

  const hostPage = await hostContext.newPage();
  const guestPage = await guestContext.newPage();
  const returnedPage = await returnedContext.newPage();

  const guestBookingPage = new BookingPage(guestPage);

  try {
    await test.step("Хост: регистрируется, добавляет навык и свободный слот на завтра", async () => {
      await prepareHost(hostPage, host, skillTag);
    });

    await test.step("Гость: регистрируется и бронирует слот хоста", async () => {
      await registerUser(guestPage, guest);
      await bookFirstSlot(guestBookingPage, skillTag, host.name);
    });

    await test.step("Гость: видит встречу в разделе «Мои встречи» до выхода", async () => {
      await guestBookingPage.openUpcomingMeetings(host.name);
      await expect(
        guestBookingPage.upcomingBookingByParticipant(host.name),
      ).toBeVisible();
    });

    await test.step("Гость: закрывает браузер — сеанс закончился", async () => {
      await guestContext.close();
    });

    await test.step("Гость: открывает сайт заново и входит с валидными данными", async () => {
      await loginUser(returnedPage, guest);
      returnedBookingPage = new BookingPage(returnedPage);
    });

    await test.step("После входа гость снова видит свою запланированную встречу", async () => {
      await returnedBookingPage!.openUpcomingMeetings(host.name);
      await expect(
        returnedBookingPage!.upcomingBookingByParticipant(host.name),
      ).toBeVisible();
    });
  } finally {
    await hostContext.close();

    await guestContext.close().catch(() => undefined);
    await returnedContext.close();
  }
});
