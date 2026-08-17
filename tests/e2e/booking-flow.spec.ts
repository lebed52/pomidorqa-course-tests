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
  await page.getByLabel("Имя").fill(user.name);
  await page.getByLabel("Email").fill(user.email);
  await page.getByLabel("Пароль").fill(user.password);
  await page.getByRole("button", { name: "Зарегистрироваться" }).click();
  await expect(page).toHaveURL(/\/pomidorqa\/?$/);
}

const catalogSkillInput = (page: Page) =>
  page.locator("#pomidorqa-catalog-skill-filter");

const catalogSearchButton = (page: Page) =>
  page.getByRole("button", { name: "Найти" });

const catalogCard = (page: Page, userName: string) =>
  page.getByRole("link", { name: userName });

const personName = (page: Page, userName: string) =>
  page.getByRole("heading", { name: userName });

const bookingLocators = (page: Page) => ({
  dayButton: page.locator('[aria-label="Дни со слотами"] button').first(),
  timeButton: page.locator('[aria-label="Время слотов"] button').first(),
  dialog: page.getByRole("dialog"),
});
const meetingLocators = (page: Page, personName: string) => ({
  participantName: page.getByText(personName, { exact: true }),
});
    const profileSkillInput = (page: Page) =>
  page.getByRole("textbox", { name: "Навык" });

const profileSkillTypeSelect = (page: Page) =>
  page.getByLabel("ТипМогу помочьХочу разобрать");

const profileAddSkillButton = (page: Page) =>
  page.getByRole("button", { name: "Добавить" });

const profileCanHelpSkills = (page: Page) =>
  page.getByTestId("can-help-skills");

const slotLocators = (page: Page) => ({
  dateInput: page.locator('xpath=//input[@id="pomidorqa-slots-date"]'),
  timeInput: page.locator('xpath=//input[@id="pomidorqa-slots-time"]'),
  submitButton: page.getByRole("button", { name: "Добавить слот" }),
  freeStatus: page.getByText("свободен", { exact: true }),
});

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
  const hostSlot = slotLocators(hostPage);
  const guestBooking = bookingLocators(guestPage);
  const guest2Booking = bookingLocators(guest2Page);
  const guestMeeting = meetingLocators(guestPage, host.name);
  const hostMeeting = meetingLocators(hostPage, guest.name);

  await test.step("Хост: регистрируется в PomidorQA", async () => {
    await registerUser(hostPage, host);
  });

  await test.step('Хост: добавляет навык «могу помочь» в профиле', async () => {
    await hostPage.goto("/pomidorqa/profile");
    await profileSkillInput(hostPage).fill(skillTag);
    await profileSkillTypeSelect(hostPage).selectOption("can_help");
    await profileAddSkillButton(hostPage).click();
    await expect(profileCanHelpSkills(hostPage)).toContainText(skillTag);
  });

  await test.step("Хост: добавляет свободный слот на завтра", async () => {
    await hostPage.goto("/pomidorqa/profile/slots");
    const tomorrow = new Date(Date.now() + 24 * 60 * 60 * 1000);
    const date = tomorrow.toISOString().slice(0, 10);
    await hostSlot.dateInput.fill(date);
    await hostSlot.timeInput.fill("12:00");
    await hostSlot.submitButton.click();
    await expect(hostSlot.freeStatus).toBeVisible();
  });

  await test.step("Гость: регистрируется отдельным аккаунтом", async () => {
    await registerUser(guestPage, guest);
  });

  await test.step("Гость: ищет хоста в каталоге по навыку (сценарий 9)", async () => {
    await catalogSkillInput(guestPage).fill(skillTag);
   await catalogSearchButton(guestPage).click();
   await expect(catalogCard(guestPage, host.name)).toBeVisible();
  });

  await test.step("Гость: открывает карточку хоста", async () => {
    await catalogCard(guestPage, host.name).click();
    await expect(personName(guestPage, host.name)).toBeVisible();
  });

  await test.step("Гость: кликает по дню и времени в календаре слотов", async () => {
    await expect(async () => {
      const dayChip = guestBooking.dayButton;
      if (!(await dayChip.isVisible().catch(() => false))) {
        await guestPage.reload();
      }
      await expect(dayChip).toBeVisible();
    }).toPass({ timeout: 5_000 });

    await guestBooking.dayButton.click();
await expect(guestBooking.timeButton).toBeVisible();

await expect(async () => {
  await guestBooking.timeButton.click();
  await expect(guestBooking.dialog).toBeVisible({ timeout: 2_000 });
}).toPass({ timeout: 10_000 });
  });

  // Важно для разбора ДЗ 4: модалку guest2 открываем ДО confirm у guest.
  // Пока слот в UI ещё свободен — оба «человек открыл и отошёл».
  await test.step("Гость2: регистрируется и тоже открывает окно бронирования на тот же слот", async () => {
    await registerUser(guest2Page, guest2);

    await catalogSkillInput(guest2Page).fill(skillTag);
    await catalogSearchButton(guest2Page).click();
    await catalogCard(guest2Page, host.name).click();
    await expect(personName(guest2Page, host.name)).toBeVisible();
    await expect(async () => {
       const dayChip = guest2Booking.dayButton;
      if (!(await dayChip.isVisible().catch(() => false))) {
        await guest2Page.reload();
      }
      await expect(dayChip).toBeVisible();
    }).toPass({ timeout: 5_000 });

    await guest2Booking.dayButton.click();
await expect(guest2Booking.timeButton).toBeVisible();

await expect(async () => {
  await guest2Booking.timeButton.click();
  await expect(guest2Booking.dialog).toBeVisible({ timeout: 2_000 });
}).toPass({ timeout: 10_000 });
  });

  await test.step("Гость: подтверждает бронирование первым — успех", async () => {
   await guestBooking.dialog
  .getByRole("button", { name: "Подтвердить" })
  .click();

await expect(guestBooking.dialog)
  .toContainText("Забронировано!", { timeout: 15_000 });
  });

  await test.step("Гость2: пытается забронировать тот же слот вторым — видит ошибку", async () => {
    await guest2Booking.dialog
  .getByRole("button", { name: "Подтвердить" })
  .click();

await expect(guest2Booking.dialog.getByRole("alert")).toContainText(
  "Этот слот только что забронировали",
  { timeout: 15_000 },
);

await expect(guest2Booking.dialog).not.toContainText("Забронировано!");
  });

  await test.step("Гость: видит бронирование в разделе «Мои встречи»", async () => {
    await expect(async () => {
      await guestPage.goto("/pomidorqa/bookings");
      await expect(guestMeeting.participantName).toBeVisible();
    }).toPass({ timeout: 5_000 });
  });

  await test.step("Хост: тоже видит это бронирование в своих «Мои встречи»", async () => {
    await expect(async () => {
      await hostPage.goto("/pomidorqa/bookings");
      await expect(hostMeeting.participantName).toBeVisible();
    }).toPass({ timeout: 5_000 });
  });

  await hostContext.close();
  await guestContext.close();
  await guest2Context.close();
});
