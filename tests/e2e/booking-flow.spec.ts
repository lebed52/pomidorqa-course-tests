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

  try {
    await test.step("Хост: регистрируется в PomidorQA", async () => {
      await registerUser(hostPage, host);
    });

    await test.step("Хост: добавляет навык «могу помочь» в профиле", async () => {
      const hostProfile = new ProfilePage(hostPage);

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

    await test.step("Гость: ищет хоста в каталоге по навыку", async () => {
      await guestBooking.searchBySkill(skillTag);

      await expect(guestBooking.catalogCard.filter({ hasText: host.name })).toBeVisible();
    });

    await test.step("Гость: открывает карточку хоста", async () => {
      await guestBooking.openHostCard(host.name);

      await expect(guestBooking.personName).toHaveText(host.name);
    });

    await test.step("Гость: кликает по дню и времени в календаре слотов", async () => {
      await guestBooking.selectFirstSlot();

      await expect(guestBooking.bookingConfirmDialog).toBeVisible();
    });

    await test.step("Гость2: регистрируется и тоже открывает окно бронирования на тот же слот", async () => {
      await registerUser(guest2Page, guest2);

      await guest2Booking.searchBySkill(skillTag);

      await expect(guest2Booking.catalogCard.filter({ hasText: host.name })).toBeVisible();

      await guest2Booking.openHostCard(host.name);

      await expect(guest2Booking.personName).toHaveText(host.name);

      await guest2Booking.selectFirstSlot();

      await expect(guest2Booking.bookingConfirmDialog).toBeVisible();
    });

    await test.step("Гость: подтверждает бронирование первым — успех", async () => {
      await guestBooking.confirmBooking();

      const success = guestBooking.bookingConfirmSuccess;
      const error = guestBooking.bookingConfirmError;

      await expect(success.or(error)).toBeVisible({ timeout: 15_000 });

      if (await error.isVisible().catch(() => false)) {
        throw new Error(`Бронирование не удалось: ${await error.textContent()}`);
      }
    });

    await test.step("Гость2: пытается забронировать тот же слот вторым — видит ошибку", async () => {
      await guest2Booking.confirmBooking();

      const success2 = guest2Booking.bookingConfirmSuccess;
      const error2 = guest2Booking.bookingConfirmError;

      await expect(success2.or(error2)).toBeVisible({ timeout: 15_000 });


      if (await success2.isVisible().catch(() => false)) {
        throw new Error("Слот должен был быть занят, но бронирование прошло успешно");
      }

      await expect(error2).toBeVisible();
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