import { test, expect } from "@playwright/test";
import { makeUser, registerUser } from "../helpers/user";
import { ProfilePage } from "../pages/profile-page";
import { createHostAndGuestsContexts, closeHostGuestContexts } from "../helpers/booking";

test("основной путь + гонка за слот: регистрация → навык → слот → поиск в каталоге → бронирование → «Мои встречи» у обоих → второй гость видит ошибку", async ({
  browser,
}) => {
  const runId = Date.now();
  const skillTag = `Playwright-demo-${runId}`;
  const host = makeUser("host", runId);
  const guest = makeUser("guest", runId);
  const guest2 = makeUser("guest2", runId);

  const { hostCtx, guestCtx, guest2Ctx } = await createHostAndGuestsContexts(browser);

  const { page: hostPage, bookingPage: hostBookingPage } = hostCtx;
  const { page: guestPage, bookingPage: guestBookingPage } = guestCtx;
  const { page: guest2Page, bookingPage: guest2BookingPage } = guest2Ctx;

  const hostProfilePage = new ProfilePage(hostPage);

  await test.step("Хост: регистрируется в PomidorQA", async () => {
    await registerUser(hostPage, host);
  });

  await test.step('Хост: добавляет навык «могу помочь» в профиле', async () => {
    await hostPage.goto("/pomidorqa/profile");
    await hostProfilePage.profileSkillInput.fill(skillTag);
    await hostProfilePage.profileSkillTypeSelect.selectOption("can_help");
    await hostProfilePage.profileAddSkillButton.click();
    await expect(hostProfilePage.profileCanHelpSkills).toContainText(skillTag);
  });

  await test.step("Хост: добавляет свободный слот на завтра", async () => {
    await hostPage.goto("/pomidorqa/profile/slots");
    const tomorrow = new Date(Date.now() + 24 * 60 * 60 * 1000);
    const date = tomorrow.toISOString().slice(0, 10);
    await hostBookingPage.bookingSlotsDateInput.fill(date);
    await hostBookingPage.bookingSlotsTimeInput.fill("12:00");
    await hostBookingPage.bookingSlotsAddSubmit.click();
    await expect(hostBookingPage.bookingSlotsCard.first()).toBeVisible();
  });

  await test.step("Гость: регистрируется отдельным аккаунтом", async () => {
    await registerUser(guestPage, guest);
  });

  await test.step("Гость: ищет хоста в каталоге по навыку (сценарий 9)", async () => {
    await guestBookingPage.bookingCatalogFilterInput.fill(skillTag);
    await guestBookingPage.bookingCatalogFilterSubmit.click();
    await expect(
        guestBookingPage.bookingCatalogCard.filter({ hasText: host.name })
    ).toBeVisible();
  });

  await test.step("Гость: открывает карточку хоста", async () => {
    await guestBookingPage.bookingCatalogCard.filter({ hasText: host.name }).click();
    await expect(guestBookingPage.bookingPersonName).toHaveText(host.name);
  });

  await test.step("Гость: кликает по дню и времени в календаре слотов", async () => {
    await expect(async () => {
      const dayChip = guestBookingPage.bookingCalendarDay.first();
      if (!(await dayChip.isVisible().catch(() => false))) {
        await guestPage.reload();
      }
      await expect(dayChip).toBeVisible();
    }).toPass({ timeout: 10_000 });

    await guestBookingPage.bookingCalendarDay.first().click();
    await guestBookingPage.bookingCalendarTime.first().click();
    await expect(guestBookingPage.bookingConfirmDialog).toBeVisible();
  });

  // Важно для разбора ДЗ 4: модалку guest2 открываем ДО confirm у guest.
  // Пока слот в UI ещё свободен — оба «человек открыл и отошёл».
  await test.step("Гость2: регистрируется и тоже открывает окно бронирования на тот же слот", async () => {
    await registerUser(guest2Page, guest2);

    await guest2BookingPage.bookingCatalogFilterInput.fill(skillTag);
    await guest2BookingPage.bookingCatalogFilterSubmit.click();
    await guest2BookingPage.bookingCatalogCard.filter({ hasText: host.name }).click();
    await expect(guest2BookingPage.bookingPersonName).toHaveText(host.name);

    await expect(async () => {
      const dayChip = guest2BookingPage.bookingCalendarDay.first();
      if (!(await dayChip.isVisible().catch(() => false))) {
        await guest2Page.reload();
      }
      await expect(dayChip).toBeVisible();
    }).toPass({ timeout: 10_000 });

    await guest2BookingPage.bookingCalendarDay.first().click();
    await guest2BookingPage.bookingCalendarTime.first().click();
    await expect(guest2BookingPage.bookingConfirmDialog).toBeVisible();
  });

  await test.step("Гость: подтверждает бронирование первым — успех", async () => {
    await guestBookingPage.bookingConfirmButton.click();
    const success = guestBookingPage.bookingConfirmSuccess;
    const error = guestBookingPage.bookingConfirmError;
    await expect(success.or(error)).toBeVisible({ timeout: 15_000 });
    if (await error.isVisible().catch(() => false)) {
      throw new Error(`Бронирование не удалось: ${await error.textContent()}`);
    }
  });

  await test.step("Гость2: пытается забронировать тот же слот вторым — видит ошибку", async () => {
    await guest2BookingPage.bookingConfirmButton.click();

    const success2 = guest2BookingPage.bookingConfirmSuccess;
    const error2 = guest2BookingPage.bookingConfirmError;
    await expect(success2.or(error2)).toBeVisible({ timeout: 15_000 });

    // Полярность наоборот относительно гостя 1: ошибка — ожидаемый результат
    if (await success2.isVisible().catch(() => false)) {
      throw new Error("Слот должен был быть занят, но бронирование прошло успешно");
    }
    await expect(error2).toBeVisible();
  });

  await test.step("Гость: видит бронирование в разделе «Мои встречи»", async () => {
    await expect(async () => {
      await guestPage.goto("/pomidorqa/bookings");
      const card = guestBookingPage.bookingCardName;
      await expect(card).toHaveText(host.name);
    }).toPass({ timeout: 10_000 });
  });

  await test.step("Хост: тоже видит это бронирование в своих «Мои встречи»", async () => {
    await expect(async () => {
      await hostPage.goto("/pomidorqa/bookings");
      await expect(hostBookingPage.bookingCardName).toHaveText(guest.name);
    }).toPass({ timeout: 10_000 });
  });

  await closeHostGuestContexts({ hostCtx, guestCtx, guest2Ctx });
});
