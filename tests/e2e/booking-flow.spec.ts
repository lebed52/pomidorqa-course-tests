import { test, expect, type Page } from "@playwright/test";

// E2E-уровень пирамиды: реальный браузер на живом стенде aiqa.su/pomidorqa.
// После ДЗ Урока 4: guest2 открывает тот же слот и должен увидеть ошибку.
// host/guest уже через registerUser; регистрация guest2 пока инлайн — это заготовка к ДЗ Урока 5.
//POMIDORQA_BASE_URL=http://localhost:3000 npx playwright test --project=e2e tests/e2e/booking-flow.spec.ts

type TestUser = {
  name: string;
  email: string;
  password: string;
};

function makeUser(role: string, runId: number): TestUser {
  return {
    name: `${role} Автотест`,
    email: `${role}-${runId}@example.com`,
    password: "testpass123",
  };
}

async function registerUser(page: Page, user: TestUser) {
  await page.goto("/pomidorqa/auth/register");
  await page.getByTestId("PomidorqaRegister-name-input").fill(user.name);
  await page.getByTestId("PomidorqaRegister-email-input").fill(user.email);
  await page.getByTestId("PomidorqaRegister-password-input").fill(user.password);
  await page.getByTestId("PomidorqaRegister-submit").click();
  await expect(page).toHaveURL(/\/pomidorqa\/?$/);
}

test("основной путь + гонка за слот: регистрация → навык → слот → поиск в каталоге → бронирование → «Мои встречи» у обоих → второй гость видит ошибку", async ({
  browser,
}) => {
  const runId = Date.now();
  const skillTag = `Playwright-demo-${runId}`;
  const host = makeUser("host", runId);
  const guest = makeUser("guest", runId);
  const guest2 = makeUser("guest2", runId);

  // Три независимых аккаунта = три независимых браузерных контекста
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
    await registerUser(guestPage, guest);
  });

  await test.step("Гость2: регистрируется отдельным аккаунтом", async () => {
    await registerUser(guest2Page, guest2);
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

  // Важно для разбора ДЗ 4: модалку guest2 открываем ДО confirm у guest.
  // Пока слот в UI ещё свободен — оба «человек открыл и отошёл».
  await test.step("Гость2: регистрируется и тоже открывает окно бронирования на тот же слот", async () => {
    await guest2Page.goto("/pomidorqa/auth/register");
    await guest2Page.getByTestId("PomidorqaRegister-name-input").fill(guest2.name);
    await guest2Page.getByTestId("PomidorqaRegister-email-input").fill(guest2.email);
    await guest2Page.getByTestId("PomidorqaRegister-password-input").fill(guest2.password);
    await guest2Page.getByTestId("PomidorqaRegister-submit").click();
    await expect(guest2Page).toHaveURL(/\/pomidorqa\/?$/);

    await guest2Page.getByTestId("PomidorqaCatalog-filter-input").fill(skillTag);
    await guest2Page.getByTestId("PomidorqaCatalog-filter-submit").click();
    await guest2Page.getByTestId("PomidorqaCatalog-card").filter({ hasText: host.name }).click();
    await expect(guest2Page.getByTestId("PomidorqaPerson-name")).toHaveText(host.name);

    await expect(async () => {
      const dayChip = guest2Page.getByTestId("BookingCalendar-day").first();
      if (!(await dayChip.isVisible().catch(() => false))) {
        await guest2Page.reload();
      }
      await expect(dayChip).toBeVisible();
    }).toPass({ timeout: 10_000 });

    await guest2Page.getByTestId("BookingCalendar-day").first().click();
    await guest2Page.getByTestId("BookingCalendar-time").first().click();
    await expect(guest2Page.getByTestId("BookingConfirmModal-dialog")).toBeVisible();
  });

  await test.step("Гость: подтверждает бронирование первым — успех", async () => {
    await guestPage.getByTestId("BookingConfirmModal-confirm").click();
    const success = guestPage.getByTestId("BookingConfirmModal-success");
    const error = guestPage.getByTestId("BookingConfirmModal-error");
    await expect(success.or(error)).toBeVisible({ timeout: 15_000 });
    if (await error.isVisible().catch(() => false)) {
      throw new Error(`Бронирование не удалось: ${await error.textContent()}`);
    }
  });

  await test.step("Гость2: пытается забронировать тот же слот вторым — видит ошибку", async () => {
    await guest2Page.getByTestId("BookingConfirmModal-confirm").click();

    const success2 = guest2Page.getByTestId("BookingConfirmModal-success");
    const error2 = guest2Page.getByTestId("BookingConfirmModal-error");
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
  await guest2Context.close();
});
