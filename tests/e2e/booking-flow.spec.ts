import { test, expect, type Page } from "@playwright/test";
import { register } from "node:module";

// E2E-уровень пирамиды: реальный браузер на живом стенде aiqa.su/pomidorqa.
// После ДЗ Урока 4: guest2 открывает тот же слот и должен увидеть ошибку.
// host/guest уже через registerUser; регистрация guest2 пока инлайн — это заготовка к ДЗ Урока 5.
//POMIDORQA_BASE_URL=http://localhost:3000 npx playwright test --project=e2e tests/e2e/booking-flow.spec.ts

//----Константы
const DEFAULT_PASSWORD = 'testpass123';
const WAIT_TIMEOUT_MS = 10_000;
const CONFIRM_TIMEOUT_MS = 15_000;
const Selectors = {
  register :{
    name: 'PomidorqaRegister-name-input',
    email: 'PomidorqaRegister-email-input',
    password: 'PomidorqaRegister-password-input',
    submit: 'PomidorqaRegister-submit'
  }
}
//----Константы навыка
const SelectorsSkill ={
  register :{
    name: 'PomidorqaRegister-name-input',
    skillType: 'PomidorqaProfile-add-skill-type-select',
    skillHelp: 'PomidorqaProfile-can-help-skills',
    skillSubmit: 'PomidorqaProfile-add-skill-submit'
  }
}

const SelectorsSlot ={
  register :{
    dateInput: 'PomidorqaSlots-date-input',
    timeInput: 'PomidorqaSlots-time-input',
    addInput: 'PomidorqaSlots-add-input',
    card: 'PomidorqaSlots-card'
  }
}

const SelectorsFilterCards ={
  register : {
    filterInput: 'PomidorqaCatalog-filter-input',
    filterSubmit: 'PomidorqaCatalog-filter-submit',
    CatalogCard: 'PomidorqaCatalog-card',
    PersonName: 'PomidorqaPerson-name'
  }
}

const SelectorsBooking = {
  register : {
    BookingDay: 'BookingCalendar-day',
    BookingTime: 'BookingCalendar-time',
    BookingModalDialog: 'BookingConfirmModal-dialog',
    BookingModdalConfirm: 'BookingConfirmModal-confirm',
    BookingModalSuccess: 'BookingConfirmModal-success',
    BookingModalError: 'BookingConfirmModal-error',
    BookingUpcomigSection: 'PomidorqaBookings-upcoming-section',
    BookingCardName: 'PomidorqaBookings-card-name'
  }
}

type TestUser = {
  name: string;
  email: string;
  password: string;
};

function makeUser(role: string, runId: number): TestUser {
  return {
    name: `${role} Автотест`,
    email: `${role}-${runId}@example.com`,
    password: DEFAULT_PASSWORD,
  };
}

async function registerUser(page: Page, user: TestUser) {
  await page.goto("/pomidorqa/auth/register");
  await page.getByTestId(Selectors.register.name).fill(user.name);
  await page.getByTestId(Selectors.register.email).fill(user.email);
  await page.getByTestId(Selectors.register.password).fill(user.password);
  await page.getByTestId(Selectors.register.submit).click();
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
    await hostPage.getByTestId(SelectorsSkill.register.name).fill(skillTag);
    await hostPage.getByTestId(SelectorsSkill.register.skillType).selectOption("can_help");
    await hostPage.getByTestId(SelectorsSkill.register.skillSubmit).click();
    await expect(hostPage.getByTestId(SelectorsSkill.register.skillHelp)).toContainText(skillTag);
  });

  await test.step("Хост: добавляет свободный слот на завтра", async () => {
    await hostPage.goto("/pomidorqa/profile/slots");
    const tomorrow = new Date(Date.now() + 24 * 60 * 60 * 1000);
    const date = tomorrow.toISOString().slice(0, 10);
    await hostPage.getByTestId(SelectorsSlot.register.dateInput).fill(date);
    await hostPage.getByTestId(SelectorsSlot.register.timeInput).fill("12:00");
    await hostPage.getByTestId(SelectorsSlot.register.addInput).click();
    await expect(hostPage.getByTestId(SelectorsSlot.register.card).first()).toBeVisible();
  });

  await test.step("Гость: регистрируется отдельным аккаунтом", async () => {
    await registerUser(guestPage, guest);
  });

  await test.step("Гость: ищет хоста в каталоге по навыку (сценарий 9)", async () => {
    await guestPage.getByTestId(SelectorsFilterCards.register.filterInput).fill(skillTag);
    await guestPage.getByTestId(SelectorsFilterCards.register.filterSubmit).click();
    await expect(
      guestPage.getByTestId("PomidorqaCatalog-card").filter({ hasText: host.name })
    ).toBeVisible();
  });

  await test.step("Гость: открывает карточку хоста", async () => {
    await guestPage.getByTestId(SelectorsFilterCards.register.CatalogCard).filter({ hasText: host.name }).click();
    await expect(guestPage.getByTestId(SelectorsFilterCards.register.PersonName)).toHaveText(host.name);
  });

  await test.step("Гость: кликает по дню и времени в календаре слотов", async () => {
    await expect(async () => {
      const dayChip = guestPage.getByTestId("BookingCalendar-day").first();
      if (!(await dayChip.isVisible().catch(() => false))) {
        await guestPage.reload();
      }
      await expect(dayChip).toBeVisible();
    }).toPass({ timeout: WAIT_TIMEOUT_MS });

    await guestPage.getByTestId("BookingCalendar-day").first().click();
    await guestPage.getByTestId("BookingCalendar-time").first().click();
    await expect(guestPage.getByTestId("BookingConfirmModal-dialog")).toBeVisible();
  });

  // Важно для разбора ДЗ 4: модалку guest2 открываем ДО confirm у guest.
  // Пока слот в UI ещё свободен — оба «человек открыл и отошёл».
  await test.step("Гость2: регистрируется и тоже открывает окно бронирования на тот же слот", async () => {
    await guest2Page.goto("/pomidorqa/auth/register");
    await guest2Page.getByTestId(Selectors.register.name).fill(guest2.name);
    await guest2Page.getByTestId(Selectors.register.email).fill(guest2.email);
    await guest2Page.getByTestId(Selectors.register.password).fill(guest2.password);
    await guest2Page.getByTestId(Selectors.register.submit).click();
    await expect(guest2Page).toHaveURL(/\/pomidorqa\/?$/);

    await guest2Page.getByTestId(SelectorsFilterCards.register.filterInput).fill(skillTag);
    await guest2Page.getByTestId(SelectorsFilterCards.register.filterSubmit).click();
    await guest2Page.getByTestId(SelectorsFilterCards.register.CatalogCard).filter({ hasText: host.name }).click();
    await expect(guest2Page.getByTestId(SelectorsFilterCards.register.PersonName)).toHaveText(host.name);

    await expect(async () => {
      const dayChip = guest2Page.getByTestId("BookingCalendar-day").first();
      if (!(await dayChip.isVisible().catch(() => false))) {
        await guest2Page.reload();
      }
      await expect(dayChip).toBeVisible();
    }).toPass({ timeout: WAIT_TIMEOUT_MS });

    await guest2Page.getByTestId(SelectorsBooking.register.BookingDay).first().click();
    await guest2Page.getByTestId(SelectorsBooking.register.BookingTime).first().click();
    await expect(guest2Page.getByTestId(SelectorsBooking.register.BookingModalDialog)).toBeVisible();
  });

  await test.step("Гость: подтверждает бронирование первым — успех", async () => {
    await guestPage.getByTestId(SelectorsBooking.register.BookingModdalConfirm).click();
    const success = guestPage.getByTestId(SelectorsBooking.register.BookingModalSuccess);
    const error = guestPage.getByTestId(SelectorsBooking.register.BookingModalError);
    await expect(success.or(error)).toBeVisible({ timeout: CONFIRM_TIMEOUT_MS });
    if (await error.isVisible().catch(() => false)) {
      throw new Error(`Бронирование не удалось: ${await error.textContent()}`);
    }
  });

  await test.step("Гость2: пытается забронировать тот же слот вторым — видит ошибку", async () => {
    await guest2Page.getByTestId("BookingConfirmModal-confirm").click();

    const success2 = guest2Page.getByTestId(SelectorsBooking.register.BookingModalSuccess);
    const error2 = guest2Page.getByTestId(SelectorsBooking.register.BookingModalError);
    await expect(success2.or(error2)).toBeVisible({ timeout: CONFIRM_TIMEOUT_MS });

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
        .getByTestId(SelectorsBooking.register.BookingUpcomigSection)
        .getByTestId(SelectorsBooking.register.BookingCardName);
      await expect(card).toHaveText(host.name);
    }).toPass({ timeout: WAIT_TIMEOUT_MS });
  });

  await test.step("Хост: тоже видит это бронирование в своих «Мои встречи»", async () => {
    await expect(async () => {
      await hostPage.goto("/pomidorqa/bookings");
      const card = hostPage
        .getByTestId(SelectorsBooking.register.BookingUpcomigSection)
        .getByTestId(SelectorsBooking.register.BookingCardName);
      await expect(card).toHaveText(guest.name);
    }).toPass({ timeout: WAIT_TIMEOUT_MS });
  });

  await hostContext.close();
  await guestContext.close();
  await guest2Context.close();
});
