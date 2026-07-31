import { test, expect } from "@playwright/test";

// E2E-уровень пирамиды: реальный браузер на живом стенде aiqa.su/pomidorqa.
//POMIDORQA_BASE_URL=http://localhost:3000 npx playwright test --project=e2e tests/e2e/booking-flow.spec.ts


test("основной путь: регистрация → навык → слот → поиск в каталоге → бронирование → «Мои встречи» у обоих", async ({
  browser,
}) => {
  const runId = Date.now();
  const skillTag = `Playwright-demo-${runId}`;
  const host = { name: "Хост Автотест", email: `host-${runId}@example.com`, password: "testpass123" };
  const guest = { name: "Гость Автотест", email: `guest-${runId}@example.com`, password: "testpass123" };

  // Два независимых аккаунта = два независимых браузерных контекста
  const hostContext = await browser.newContext();
  const guestContext = await browser.newContext();
  const hostPage = await hostContext.newPage();
  const guestPage = await guestContext.newPage();

  await test.step("Хост: регистрируется в PomidorQA", async () => {
    await hostPage.goto("/pomidorqa/auth/register");
    await hostPage.getByTestId("PomidorqaRegister-name-input").fill(host.name);
    await hostPage.getByTestId("PomidorqaRegister-email-input").fill(host.email);
    await hostPage.getByTestId("PomidorqaRegister-password-input").fill(host.password);
    await hostPage.getByTestId("PomidorqaRegister-submit").click();
    await expect(hostPage).toHaveURL(/\/pomidorqa\/?$/);
  });

  await test.step('Хост: добавляет навык «могу помочь» в профиле', async () => {
    await hostPage.goto("/pomidorqa/profile");
    await hostPage.getByTestId("PomidorqaProfile-add-skill-input").fill(skillTag);
    await hostPage.getByTestId("PomidorqaProfile-add-skill-type-select").selectOption("can_help");
    await hostPage.getByTestId("PomidorqaProfile-add-skill-submit").click();
    await expect(hostPage.getByTestId("PomidorqaProfile-can-help-skills")).toContainText(skillTag);
  });

  await test.step("Хост: добавляет свободный слот на завтра", async () => {
    await hostPage.goto("/pomidorqa/profile/slots");
    const tomorrow = new Date(Date.now() + 24 * 60 * 60 * 1000);
    const date = tomorrow.toISOString().slice(0, 10);
    await hostPage.getByTestId("PomidorqaSlots-date-input").fill(date);
    await hostPage.getByTestId("PomidorqaSlots-time-input").fill("12:00");
    await hostPage.getByTestId("PomidorqaSlots-add-submit").click();
    await expect(hostPage.getByTestId("PomidorqaSlots-card").first()).toBeVisible();
  });

  await test.step("Гость: регистрируется отдельным аккаунтом", async () => {
    await guestPage.goto("/pomidorqa/auth/register");
    await guestPage.getByTestId("PomidorqaRegister-name-input").fill(guest.name);
    await guestPage.getByTestId("PomidorqaRegister-email-input").fill(guest.email);
    await guestPage.getByTestId("PomidorqaRegister-password-input").fill(guest.password);
    await guestPage.getByTestId("PomidorqaRegister-submit").click();
    await expect(guestPage).toHaveURL(/\/pomidorqa\/?$/);
  });

  await test.step("Гость: ищет хоста в каталоге по навыку (сценарий 9)", async () => {
    await guestPage.getByTestId("PomidorqaCatalog-filter-input").fill(skillTag);
    await guestPage.getByTestId("PomidorqaCatalog-filter-submit").click();
    await expect(
      guestPage.getByTestId("PomidorqaCatalog-card").filter({ hasText: host.name })
    ).toBeVisible();
  });

  await test.step("Гость: открывает карточку хоста", async () => {
    await guestPage.getByTestId("PomidorqaCatalog-card").filter({ hasText: host.name }).click();
    await expect(guestPage.getByTestId("PomidorqaPerson-name")).toHaveText(host.name);
  });

  await test.step("Гость: кликает по дню и времени в календаре слотов", async () => {
    await expect(async () => {
      const dayChip = guestPage.getByTestId("BookingCalendar-day").first();
      if (!(await dayChip.isVisible().catch(() => false))) {
        await guestPage.reload();
      }
      await expect(dayChip).toBeVisible();
    }).toPass({ timeout: 10_000 });

    await guestPage.getByTestId("BookingCalendar-day").first().click();
    await guestPage.getByTestId("BookingCalendar-time").first().click();
    await expect(guestPage.getByTestId("BookingConfirmModal-dialog")).toBeVisible();
  });

  await test.step("Гость: подтверждает бронирование в модалке", async () => {
    await guestPage.getByTestId("BookingConfirmModal-confirm").click();
    const success = guestPage.getByTestId("BookingConfirmModal-success");
    const error = guestPage.getByTestId("BookingConfirmModal-error");
    await expect(success.or(error)).toBeVisible({ timeout: 15_000 });
    if (await error.isVisible().catch(() => false)) {
      throw new Error(`Бронирование не удалось: ${await error.textContent()}`);
    }
  });

  await test.step("Гость: видит бронирование в разделе «Мои встречи»", async () => {
    await expect(async () => {
      await guestPage.goto("/pomidorqa/bookings");
      const card = guestPage
        .getByTestId("PomidorqaBookings-upcoming-section")
        .getByTestId("PomidorqaBookings-card-name");
      await expect(card).toHaveText(host.name);
    }).toPass({ timeout: 10_000 });
  });

  await test.step("Хост: тоже видит это бронирование в своих «Мои встречи»", async () => {
    await expect(async () => {
      await hostPage.goto("/pomidorqa/bookings");
      const card = hostPage
        .getByTestId("PomidorqaBookings-upcoming-section")
        .getByTestId("PomidorqaBookings-card-name");
      await expect(card).toHaveText(guest.name);
    }).toPass({ timeout: 10_000 });
  });

  await hostContext.close();
  await guestContext.close();
});
