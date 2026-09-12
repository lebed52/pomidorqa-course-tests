import { test, expect, type BrowserContext } from "@playwright/test";
import { deleteUserViaApi } from "../helpers/user";
import { prepareBookingFlow } from "../helpers/booking-flow";

let contexts: BrowserContext[] = [];

test.afterEach(async () => {
  for (const context of contexts) {
    await deleteUserViaApi(context.request);
    await context.close();
  }

  contexts = [];
});

test("Основной путь + гонка за слот: регистрация → навык → слот → поиск в каталоге → бронирование → «Мои встречи» у обоих → второй гость видит ошибку", async ({ browser }) => {
  test.setTimeout(60_000);

  const {
    skillTag,
    host,
    guest,
    guest2,
    hostContext,
    guestContext,
    guest2Context,
    hostPage,
    guestPage,
    guest2Page,
    hostProfile,
    guestCatalog,
    guest2Catalog,
    hostBooking,
    guestBooking,
    guest2Booking,
    slotDate,
  } = await prepareBookingFlow(browser);

  contexts = [hostContext, guestContext, guest2Context];

  await test.step("Хост: добавляет навык «могу помочь»", async () => {
    await hostPage.goto("/pomidorqa/profile");
    await hostProfile.addSkill(skillTag, "can_help");
  });

  await test.step("Хост: проверяет, что навык появился в блоке «могу помочь»", async () => {
    await expect(hostProfile.canHelpSkills()).toContainText(skillTag);
  });

  await test.step("Хост: добавляет свободный слот на завтра", async () => {
    const slotTime = "12:00";

    await hostPage.goto("/pomidorqa/profile/slots");
    await hostBooking.addSlot(slotDate, slotTime);
  });

  await test.step("Хост: проверяет, что слот появился", async () => {
    await expect(hostBooking.freeSlot()).toBeVisible();
  });

  await test.step("Гость: ищет хоста в каталоге по навыку", async () => {
    await guestCatalog.searchBySkill(skillTag);
  });

  await test.step("Гость: проверяет, что хост найден", async () => {
    await expect(guestCatalog.personCard(host.name)).toBeVisible();
  });

  await test.step("Гость: открывает карточку хоста", async () => {
    await guestCatalog.openPerson(host.name);
  });

  await test.step("Гость: проверяет карточку хоста", async () => {
    await expect(guestCatalog.personName()).toHaveText(host.name);
  });

  await test.step("Гость: выбирает день и время", async () => {
    await guestBooking.selectDayAndTime(slotDate);
  });

  await test.step("Гость: проверяет, что открылось окно подтверждения", async () => {
    await expect(guestBooking.bookingDialog()).toBeVisible();
  });

  await test.step("Гость2: ищет хоста в каталоге по навыку", async () => {
    await guest2Catalog.searchBySkill(skillTag);
  });

  await test.step("Гость2: проверяет, что хост найден", async () => {
    await expect(guest2Catalog.personCard(host.name)).toBeVisible();
  });

  await test.step("Гость2: открывает карточку хоста", async () => {
    await guest2Catalog.openPerson(host.name);
  });

  await test.step("Гость2: проверяет карточку хоста", async () => {
    await expect(guest2Catalog.personName()).toHaveText(host.name);
  });

  await test.step("Гость2: выбирает тот же день и время", async () => {
    await guest2Booking.selectDayAndTime(slotDate);
  });

  await test.step("Гость2: проверяет, что открылось окно подтверждения", async () => {
    await expect(guest2Booking.bookingDialog()).toBeVisible();
  });

  await test.step("Гость: подтверждает бронирование первым", async () => {
    await guestBooking.confirmBooking();
  });

  await test.step("Гость: проверяет успешное бронирование", async () => {
    await expect(guestBooking.bookingSuccess()).toBeVisible({ timeout: 15_000 });
  });

  await test.step("Гость2: пытается забронировать тот же слот вторым", async () => {
    await guest2Booking.confirmBooking();
  });

  await test.step("Гость2: проверяет ошибку занятого слота", async () => {
    await expect(guest2Booking.bookingError()).toBeVisible({ timeout: 15_000 });
  });

  await test.step("Гость: открывает «Мои встречи»", async () => {
    await guestBooking.goToBookings();
  });

  await test.step("Гость: проверяет своё бронирование", async () => {
    await expect(
      guestBooking.upcomingBookingCard(host.name)
    ).toBeVisible();
  });

  await test.step("Хост: открывает «Мои встречи»", async () => {
    await hostBooking.goToBookings();
  });

  await test.step("Хост: проверяет бронирование от гостя", async () => {
    await expect(
      hostBooking.upcomingBookingCard(guest.name)
    ).toBeVisible();
  });
});