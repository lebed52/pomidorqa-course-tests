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

await test.step("Гость и Гость2: параллельно регистрируются и открывают диалог брони на один слот", async () => {
  await Promise.all([
    (async () => {
      await registerUser(guestPage, guest);
      await guestBooking.searchBySkill(skillTag);
      await guestBooking.openHostCard(host.name);
      await expect(async () => {
        await guestBooking.selectFirstSlot();
        await expect(guestBooking.bookingConfirmDialog).toBeVisible({ timeout: 1_000 });
      }).toPass({ timeout: 30_000, intervals: [500, 1_000, 2_000] });
    })(),
    (async () => {
      await registerUser(guest2Page, guest2);
      await guest2Booking.searchBySkill(skillTag);
      await guest2Booking.openHostCard(host.name);
      await expect(async () => {
        await guest2Booking.selectFirstSlot();
        await expect(guest2Booking.bookingConfirmDialog).toBeVisible({ timeout: 1_000 });
      }).toPass({ timeout: 30_000, intervals: [500, 1_000, 2_000] });
    })(),
  ]);
});


    await test.step("У обоих гостей открылся диалог подтверждения брони на один слот", async () => {
      await expect(guestBooking.bookingConfirmDialog).toBeVisible();
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