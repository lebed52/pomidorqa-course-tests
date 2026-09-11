import { test, expect } from "@playwright/test";
import { registerUser, makeUser, type TestUser } from "../helpers/user";
import { ProfilePage } from "../pages/profile-page";
import { BookingPage } from "../pages/booking-page";

test.describe("Флоу отмены бронирования", () => {

 test("отмена бронирования: карточка переходит в прошедшие, отмену видят хост и гость", async ({ browser }) => {
  const runId = Date.now();
  const skillTag = `Playwright-demo-${runId}`;
  const host = makeUser("host", runId);
  const guest = makeUser("guest", runId);

  const hostContext = await browser.newContext();
  const guestContext = await browser.newContext();
  
  const hostPage = await hostContext.newPage();
  const guestPage = await guestContext.newPage();

  const hostProfile = new ProfilePage(hostPage);
  const hostBooking = new BookingPage(hostPage);
  const guestBooking = new BookingPage(guestPage);

  await test.step("Хост: регистрируется в PomidorQA", async () => {
    await registerUser(hostPage, host);
  });
 
  await test.step("Хост: добавляет навык «могу помочь» в профиле", async () => {
    await hostProfile.goto();
    await hostProfile.addSkill(skillTag, "can_help");
  });

  await test.step("Хост: проверяет отображение добавленного навыка", async () => {
    await expect(hostProfile.canHelpSkills).toContainText(skillTag);
  });

  await test.step("Хост: добавляет свободный слот на завтра", async () => {
    await hostBooking.addSlot(host.slotTime);
  });

  await test.step("Хост: проверяет появление карточки созданного слота", async () => {
    await expect(hostBooking.slotsCard.first()).toBeVisible();
  });

  await test.step("Гость: регистрируется отдельным аккаунтом", async () => {
    await registerUser(guestPage, guest);
  });

  await test.step("Гость: ищет хоста в каталоге по навыку", async () => {
    await guestBooking.searchBySkill(skillTag);
  });

  await test.step("Гость: проверяет наличие карточки хоста в результатах поиска", async () => {
    await expect(guestBooking.catalogCard.filter({ hasText: host.name })).toBeVisible();
  });

  await test.step("Гость: открывает карточку хоста", async () => {
    await guestBooking.openHostCard(host.name);
  });

  await test.step("Гость: проверяет имя хоста в открывшейся карточке", async () => {
    await expect(guestBooking.personName).toHaveText(host.name);
  });

  await test.step("Гость: дожидается появления слотов в календаре", async () => {
    await expect(async () => {
      const dayChip = guestBooking.bookingCalendarDay.first();
      if (!(await dayChip.isVisible().catch(() => false))) {
        await guestPage.reload();
      }
      await expect(dayChip).toBeVisible();
    }).toPass({ timeout: 10_000 });
  });

  await test.step("Гость: выбирает первый доступный слот", async () => {
    await guestBooking.selectFirstSlot();
  });


  await test.step("Гость: проверяет появление модального окна подтверждения бронирования", async () => {
    await expect(guestBooking.bookingConfirmDialog).toBeVisible();
  });

  await test.step("Гость: подтверждает бронирование", async () => {
    await guestBooking.confirmBooking();
  });

  await test.step("Гость: проверяет успешность отправки формы бронирования", async () => {
    await expect(guestBooking.bookingConfirmSuccess).toBeVisible({ timeout: 15_000 });
  });

  await test.step("Гость: переходит в раздел «Мои встречи»", async () => {
    await guestBooking.gotoBookings();
  });

  await test.step("Гость: видит бронирование", async () => {
    await expect(async () => {
      const card = guestBooking.bookingsCardName;
      await expect(card).toHaveText(host.name);
    }).toPass({ timeout: 10_000 });
  });

  await test.step("Гость: отменяет встречу в разделе «Мои встречи»", async () => {
    await guestBooking.cancelBooking(host.name);
  });

  await test.step("Гость: проверяет, что встреча удалена из «Ближайших»", async () => {
    await expect(guestBooking.bookingsCardName.filter({ hasText: host.name })).toBeHidden();
  });

  await test.step("Гость: карточка появляется в «Прошедшие и отменённые»", async () => {
    const bookingCancelCard = guestBooking.bookingCancelCardByName(host.name);
    await expect(bookingCancelCard).toBeVisible();
    await expect(bookingCancelCard).toContainText("отменено");
  });

  await test.step("Гость: перезагрузка страницы", async () => {
    await guestBooking.reload();
  });

  await test.step("Гость: после перезагрузки отмена отображается", async () => {
    const bookingCancelCard = guestBooking.bookingCancelCardByName(host.name);
    await expect(bookingCancelCard).toBeVisible();
    await expect(bookingCancelCard).toContainText("отменено")
  });

  await test.step("Хост: переходит в раздел «Мои встречи»", async () => {
    await hostBooking.gotoBookings();
  });

  await test.step("Хост: видит отмененную встречу с Гостем", async () => {
    const bookingCancelCard = hostBooking.bookingCancelCardByName(guest.name);
    await expect(bookingCancelCard).toBeVisible();
    await expect(bookingCancelCard).toContainText("отменено");
  });

  await hostContext.close();
  await guestContext.close();
});
});

