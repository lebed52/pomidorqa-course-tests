import { test, expect } from "@playwright/test";
import { makeUser, registerUser } from "../helpers/user";
import { createHostAndGuestsContexts, closeHostGuestContexts } from "../helpers/booking";
import { ProfilePage } from "../pages/profile-page";

// POMIDORQA_BASE_URL=http://localhost:3000 npx playwright test --project=e2e tests/e2e/booking-flow.spec.ts
test("основной путь + гонка за слот: регистрация → навык → слот → поиск в каталоге → бронирование → «Мои встречи» у обоих → второй гость видит ошибку", async ({ browser }) => {
  test.setTimeout(60_000);

  const runId = Date.now();
  const skillTag = `Playwright-demo-${runId}`;

  const host = makeUser("host", runId);
  const guest = makeUser("guest", runId);
  const guest2 = makeUser("guest2", runId);

  const contexts = await createHostAndGuestsContexts(browser);
  const { hostPage, guestPage, guest2Page, hostBooking, guestBooking, guest2Booking } = contexts;
  const hostProfile = new ProfilePage(hostPage);

  try {
    await test.step("Хост: регистрируется в PomidorQA", async () => {
      await registerUser(hostPage, host);
    });

    await test.step("Хост: добавляет навык «могу помочь» в профиле", async () => {
      await hostProfile.goto();
      await hostProfile.addSkill(skillTag, "can_help");
    });

    await test.step("Навык хоста появился в блоке «Могу помочь»", async () => {
      await expect(hostProfile.canHelpSkills).toContainText(skillTag);
    });

    await test.step("Хост: добавляет свободный слот на завтра", async () => {
      await hostBooking.addSlot("12:00");
    });

    await test.step("Слот отображается в списке хоста", async () => {
      await expect(hostBooking.slotsCard.first()).toBeVisible();
    });

    await test.step("Гость: регистрируется отдельным аккаунтом", async () => {
      await registerUser(guestPage, guest);
    });

    await test.step("Гость: ищет хоста в каталоге по навыку", async () => {
      await guestBooking.searchBySkill(skillTag);
    });

    await test.step("Хост найден в каталоге по навыку", async () => {
      await expect(guestBooking.catalogCard.filter({ hasText: host.name })).toBeVisible();
    });

    await test.step("Гость: открывает карточку хоста", async () => {
      await guestBooking.openHostCard(host.name);
    });

    await test.step("Гостю открыта карточка хоста", async () => {
      await expect(guestBooking.personName).toHaveText(host.name);
    });

    await test.step("Гость: кликает по дню и времени в календаре слотов", async () => {
      await guestBooking.selectFirstSlot();
    });

    await test.step("У гостя открылся диалог подтверждения брони", async () => {
      await expect(guestBooking.bookingConfirmDialog).toBeVisible();
    });

    await test.step("Гость2: регистрируется отдельным аккаунтом", async () => {
      await registerUser(guest2Page, guest2);
    });

    await test.step("Гость2: ищет хоста в каталоге по навыку", async () => {
      await guest2Booking.searchBySkill(skillTag);
    });

    await test.step("Хост найден в каталоге для гостя2", async () => {
      await expect(guest2Booking.catalogCard.filter({ hasText: host.name })).toBeVisible();
    });

    await test.step("Гость2: открывает карточку хоста", async () => {
      await guest2Booking.openHostCard(host.name);
    });

    await test.step("Гостю2 открыта карточка хоста", async () => {
      await expect(guest2Booking.personName).toHaveText(host.name);
    });

    await test.step("Гость2: тоже кликает по тому же дню и времени в календаре слотов", async () => {
      await guest2Booking.selectFirstSlot();
    });

    await test.step("У гостя2 тоже открылся диалог подтверждения брони на тот же слот", async () => {
      await expect(guest2Booking.bookingConfirmDialog).toBeVisible();
    });

    await test.step("Гость: подтверждает бронирование первым", async () => {
      await guestBooking.confirmBooking();
    });

    await test.step("Бронирование гостя прошло успешно", async () => {
      await expect(guestBooking.bookingConfirmSuccess).toBeVisible({ timeout: 15_000 });
      await expect(guestBooking.bookingConfirmError).toBeHidden();
    });

    await test.step("Гость2: пытается забронировать тот же слот вторым", async () => {
      await guest2Booking.confirmBooking();
    });

    await test.step("Гостю2 показана ошибка о занятом слоте", async () => {
      await expect(guest2Booking.bookingConfirmError).toBeVisible({ timeout: 15_000 });
      await expect(guest2Booking.bookingConfirmSuccess).toBeHidden();
    });

    await test.step("Гость: видит бронирование в разделе «Мои встречи»", async () => {
      await expect(async () => {
        await guestBooking.gotoBookings();

        await expect(guestBooking.bookingsCardName).toHaveText(host.name);
      }).toPass({ timeout: 10_000 });
    });

    await test.step("Хост: тоже видит это бронирование в своих «Мои встречи»", async () => {
      await expect(async () => {
        await hostBooking.gotoBookings();

        await expect(hostBooking.bookingsCardName).toHaveText(guest.name);
      }).toPass({ timeout: 10_000 });
    });
  } finally {
    await closeHostGuestContexts(contexts);
  }
});