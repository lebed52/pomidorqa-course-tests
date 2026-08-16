import { test, expect, type Page, type Locator } from "@playwright/test";

// E2E-уровень пирамиды: реальный браузер на живом стенде aiqa.su/pomidorqa.
// После ДЗ Урока 4: guest2 открывает тот же слот и должен увидеть ошибку.
//
// POMIDORQA_BASE_URL=http://localhost:3000
// npx playwright test --project=e2e tests/e2e/booking-flow.spec.ts


// ============================================================
// LOCATORS
// ============================================================

// -------------------- Registration --------------------

const REGISTER = {
  nameInput: "#pomidorqa-register-name",
  emailInput: "#pomidorqa-register-email",
  passwordInput: "#pomidorqa-register-password",
  submitButton: "Зарегистрироваться",
} as const;

const registerNameInput = (page: Page): Locator =>
  page.locator(REGISTER.nameInput);

const registerEmailInput = (page: Page): Locator =>
  page.locator(REGISTER.emailInput);

const registerPasswordInput = (page: Page): Locator =>
  page.locator(REGISTER.passwordInput);

const registerSubmitButton = (page: Page): Locator =>
  page.getByRole("button", {
    name: REGISTER.submitButton,
  });


// -------------------- Profile --------------------

const PROFILE = {
  skillInputLabel: "Навык",
  skillTypeSelect: "#pomidorqa-profile-skill-type",
  skillSubmitButton: "Добавить",
} as const;

const skillInput = (page: Page): Locator =>
  page.getByRole("textbox", {
    name: PROFILE.skillInputLabel,
  });

const skillTypeSelect = (page: Page): Locator =>
  page.locator(PROFILE.skillTypeSelect);

const skillSubmitButton = (page: Page): Locator =>
  page.getByRole("button", {
    name: PROFILE.skillSubmitButton,
  });

const addedSkill = (
  page: Page,
  skill: string
): Locator =>
  page.getByRole("button", {
    name: skill,
  });


// -------------------- Slots --------------------

const SLOTS = {
  dateInput: "#pomidorqa-slots-date",
  timeInput: "#pomidorqa-slots-time",
  addButton: "Добавить слот",
  slotCard: "[data-slot-id]",
} as const;

const slotDateInput = (page: Page): Locator =>
  page.locator(SLOTS.dateInput);

const slotTimeInput = (page: Page): Locator =>
  page.locator(SLOTS.timeInput);

const addSlotButton = (page: Page): Locator =>
  page.getByRole("button", {
    name: SLOTS.addButton,
  });

const slotCard = (page: Page): Locator =>
  page.locator(SLOTS.slotCard);


// -------------------- Catalog --------------------

const CATALOG = {
  filterInput: "#pomidorqa-catalog-skill-filter",
  findButton: "Найти",
  card: "person-card",
} as const;

const catalogFilterInput = (page: Page): Locator =>
  page.locator(CATALOG.filterInput);

const catalogFindButton = (page: Page): Locator =>
  page.getByRole("button", {
    name: CATALOG.findButton,
  });

const catalogCards = (page: Page): Locator =>
  page.getByTestId(CATALOG.card);

const hostCard = (
  page: Page,
  hostName: string
): Locator =>
  catalogCards(page).filter({
    hasText: hostName,
  });


// -------------------- Person --------------------

const personName = (page: Page, name: string): Locator =>
  page.getByRole("heading", {
    name : name,
  });


// -------------------- Booking calendar --------------------

const BOOKING_CALENDAR = {
  day: "[data-date]",
  time: "BookingCalendar-time",
  timeGroup: "Время слотов",
} as const;

const bookingDay = (page: Page): Locator =>
  page.locator(BOOKING_CALENDAR.day);

const bookingTimeGroup = (page: Page): Locator =>
  page.getByRole("group", {
    name: BOOKING_CALENDAR.timeGroup,
  });

const bookingTime = (page: Page): Locator =>
  bookingTimeGroup(page).getByRole("button");


// -------------------- Booking modal --------------------

const BOOKING_MODAL = {
  dialog: "dialog",
  confirmButton: "Подтвердить",
  loadingButton: "Бронируем…",
  successMessage: "Забронировано",
} as const;

const bookingDialog = (page: Page): Locator =>
  page.getByRole("dialog");

const bookingConfirmButton = (page: Page): Locator =>
  bookingDialog(page).getByRole("button", {
    name: BOOKING_MODAL.confirmButton,
  });

const bookingLoadingButton = (page: Page): Locator =>
  bookingDialog(page).getByRole("button", {
    name: BOOKING_MODAL.loadingButton,
  });

const bookingSuccessMessage = (page: Page): Locator =>
  bookingDialog(page).getByRole("status");

const bookingErrorMessage = (page: Page): Locator =>
  bookingDialog(page).getByRole("alert");


// -------------------- My bookings --------------------

const BOOKINGS = {
  upcomingSection: "upcoming-meetings",
  bookingCard: "[data-booking-id]",
} as const;

const upcomingMeetings = (page: Page): Locator =>
  page.getByTestId(BOOKINGS.upcomingSection);

const bookingCards = (page: Page): Locator =>
  upcomingMeetings(page).locator(BOOKINGS.bookingCard);

const bookingCardWithGuest = (
  page: Page,
  guestName: string
): Locator =>
  bookingCards(page).filter({
    hasText: guestName,
  });


// ============================================================
// TEST DATA
// ============================================================

type TestUser = {
  name: string;
  email: string;
  password: string;
};

function makeUser(
  role: string,
  runId: number
): TestUser {
  return {
    name: `${role} Автотест`,
    email: `${role}-${runId}@example.com`,
    password: "testpass123",
  };
}

async function registerUser(page: Page, user: TestUser) {
        await page.goto(
          "/pomidorqa/auth/register"
        );

        await registerNameInput(page).fill(
          user.name
        );

        await registerEmailInput(page).fill(
          user.email
        );

        await registerPasswordInput(page).fill(
          user.password
        );

        await registerSubmitButton(page).click();

        await expect(page).toHaveURL(
          /\/pomidorqa\/?$/
        );
}


// ============================================================
// TEST
// ============================================================

test(
  "основной путь + гонка за слот: регистрация → навык → слот → поиск в каталоге → бронирование → «Мои встречи» у обоих → второй гость видит ошибку",
  async ({ browser }) => {
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


    // ============================================================
    // HOST
    // ============================================================

    await test.step(
      "Хост: регистрируется в PomidorQA",
      async () => {
        await registerUser(hostPage, host)
      }
    );


    await test.step(
      'Хост: добавляет навык «могу помочь» в профиле',
      async () => {
        await hostPage.goto("/pomidorqa/profile");

        await skillInput(hostPage).fill(skillTag);
        await skillTypeSelect(hostPage).selectOption("can_help");
        await skillSubmitButton(hostPage).click();

        await expect(
          addedSkill(hostPage, skillTag)
        ).toContainText(skillTag);
      }
    );


    await test.step(
      "Хост: добавляет свободный слот на завтра",
      async () => {
        await hostPage.goto(
          "/pomidorqa/profile/slots"
        );

        const tomorrow = new Date(
          Date.now() + 24 * 60 * 60 * 1000
        );

        const date = tomorrow
          .toISOString()
          .slice(0, 10);

        await slotDateInput(hostPage).fill(date);

        await slotTimeInput(hostPage).fill(
          "12:00"
        );

        await addSlotButton(hostPage).click();

        await expect(
          slotCard(hostPage).first()
        ).toBeVisible();
      }
    );


    // ============================================================
    // GUEST
    // ============================================================

    await test.step(
      "Гость: регистрируется отдельным аккаунтом",
      async () => {
        await registerUser(guestPage, guest)
      }
    );


    await test.step(
      "Гость: ищет хоста в каталоге по навыку",
      async () => {
        await catalogFilterInput(guestPage).fill(
          skillTag
        );

        await catalogFindButton(guestPage).click();

        await expect(
          hostCard(
            guestPage,
            host.name
          )
        ).toBeVisible();
      }
    );


    await test.step(
      "Гость: открывает карточку хоста",
      async () => {
        await hostCard(
          guestPage,
          host.name
        ).click();

        await expect(
          personName(guestPage, host.name)
        ).toHaveText(host.name);
      }
    );


    await test.step(
      "Гость: кликает по дню и времени в календаре слотов",
      async () => {
        await expect(async () => {
          const day = bookingDay(guestPage).first();

          if (
            !(await day.isVisible().catch(() => false))
          ) {
            await guestPage.reload();
          }

          await expect(day).toBeVisible();
        }).toPass({
          timeout: 10_000,
        });

        await bookingDay(guestPage)
          .first()
          .click();

        await bookingTime(guestPage)
          .first()
          .click();

        await expect(
          bookingDialog(guestPage)
        ).toBeVisible();
      }
    );


    // ============================================================
    // GUEST 2
    // ============================================================

    await test.step(
      "Гость2: регистрируется и открывает окно бронирования на тот же слот",
      async () => {
        await registerUser(guest2Page, guest2);

        await catalogFilterInput(
          guest2Page
        ).fill(skillTag);

        await catalogFindButton(
          guest2Page
        ).click();

        await hostCard(
          guest2Page,
          host.name
        ).click();

        await expect(
          personName(guest2Page, host.name)
        ).toHaveText(host.name);

        await expect(async () => {
          const day = bookingDay(
            guest2Page
          ).first();

          if (
            !(await day.isVisible().catch(() => false))
          ) {
            await guest2Page.reload();
          }

          await expect(day).toBeVisible();
        }).toPass({
          timeout: 10_000,
        });

        await bookingDay(guest2Page)
          .first()
          .click();

        await bookingTime(guest2Page)
          .first()
          .click();

        await expect(
          bookingDialog(guest2Page)
        ).toBeVisible();
      }
    );


    // ============================================================
    // BOOKING
    // ============================================================

    await test.step(
      "Гость: подтверждает бронирование первым — успех",
      async () => {
        await bookingConfirmButton(
          guestPage
        ).click();

        await expect(
          bookingLoadingButton(guestPage)
        ).not.toBeVisible({
          timeout: 15_000,
        });

        await expect(
          bookingSuccessMessage(guestPage)
        ).toBeVisible({
          timeout: 15_000,
        });

        await expect(
          bookingSuccessMessage(guestPage)
        ).toContainText(
          BOOKING_MODAL.successMessage
        );
      }
    );


    await test.step(
      "Гость2: пытается забронировать тот же слот вторым — видит ошибку",
      async () => {
        await bookingConfirmButton(
          guest2Page
        ).click();

        await expect(
          bookingErrorMessage(guest2Page)
        ).toBeVisible({
          timeout: 15_000,
        });

        await expect(
          bookingErrorMessage(guest2Page)
        ).not.toContainText(
          BOOKING_MODAL.successMessage
        );
      }
    );


    // ============================================================
    // MY BOOKINGS
    // ============================================================

    await test.step(
      "Гость: видит бронирование в разделе «Мои встречи»",
      async () => {
        await expect(async () => {
          await guestPage.goto(
            "/pomidorqa/bookings"
          );

          await expect(
            bookingCardWithGuest(
              guestPage,
              host.name
            )
          ).toBeVisible();
        }).toPass({
          timeout: 10_000,
        });
      }
    );


    await test.step(
      "Хост: тоже видит это бронирование в своих «Мои встречи»",
      async () => {
        await expect(async () => {
          await hostPage.goto(
            "/pomidorqa/bookings"
          );

          await expect(
            bookingCardWithGuest(
              hostPage,
              guest.name
            )
          ).toBeVisible();
        }).toPass({
          timeout: 10_000,
        });
      }
    );


    // ============================================================
    // CLEANUP
    // ============================================================

    await hostContext.close();
    await guestContext.close();
    await guest2Context.close();
  }
);