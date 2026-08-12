import {
  test,
  expect,
  Page,
  Browser,
  BrowserContext,
} from "@playwright/test";

// E2E-уровень пирамиды: реальный браузер на живом стенде aiqa.su/pomidorqa.
//POMIDORQA_BASE_URL=http://localhost:3000 npx playwright test --project=e2e tests/e2e/booking-flow.spec.ts

interface User {
  name: string;
  email: string;
  password: string;
}

interface TestUser {
  user: User;
  context: BrowserContext;
  page: Page;
}

interface BookingResult {
  success: boolean;
  error: string | null;
}

// -------------------- HELPERS --------------------

async function createTestUser(
  browser: Browser,
  user: User
): Promise<TestUser> {
  const context = await browser.newContext();
  const page = await context.newPage();

  return {
    user,
    context,
    page,
  };
}

async function registerUser(page: Page, user: User) {
  await page.goto("/pomidorqa/auth/register");

  await page
    .getByTestId("PomidorqaRegister-name-input")
    .fill(user.name);

  await page
    .getByTestId("PomidorqaRegister-email-input")
    .fill(user.email);

  await page
    .getByTestId("PomidorqaRegister-password-input")
    .fill(user.password);

  await page
    .getByTestId("PomidorqaRegister-submit")
    .click();
}

async function addSkill(page: Page, skill: string) {
  await page.goto("/pomidorqa/profile");

  await page
    .getByTestId("PomidorqaProfile-add-skill-input")
    .fill(skill);

  await page
    .getByTestId("PomidorqaProfile-add-skill-type-select")
    .selectOption("can_help");

  await page
    .getByTestId("PomidorqaProfile-add-skill-submit")
    .click();
}

async function addSlot(
  page: Page,
  date: string,
  time: string
) {
  await page.goto("/pomidorqa/profile/slots");

  await page
    .getByTestId("PomidorqaSlots-date-input")
    .fill(date);

  await page
    .getByTestId("PomidorqaSlots-time-input")
    .fill(time);

  await page
    .getByTestId("PomidorqaSlots-add-submit")
    .click();
}

async function findHost(
  page: Page,
  skill: string,
  hostName: string
) {
  await page
    .getByTestId("PomidorqaCatalog-filter-input")
    .fill(skill);

  await page
    .getByTestId("PomidorqaCatalog-filter-submit")
    .click();

  const hostCard = page
    .getByTestId("PomidorqaCatalog-card")
    .filter({ hasText: hostName });

  await expect(hostCard).toBeVisible();

  await hostCard.click();

  await expect(
    page.getByTestId("PomidorqaPerson-name")
  ).toHaveText(hostName);
}

async function selectBookingSlot(page: Page) {
  await expect(async () => {
    const dayChip = page
      .getByTestId("BookingCalendar-day")
      .first();

    if (!(await dayChip.isVisible().catch(() => false))) {
      await page.reload();
    }

    await expect(dayChip).toBeVisible();
  }).toPass({ timeout: 10_000 });

  await page
    .getByTestId("BookingCalendar-day")
    .first()
    .click();

  await page
    .getByTestId("BookingCalendar-time")
    .first()
    .click();

  await expect(
    page.getByTestId("BookingConfirmModal-dialog")
  ).toBeVisible();
}

async function prepareBooking(
  page: Page,
  skill: string,
  hostName: string
) {
  await findHost(page, skill, hostName);
  await selectBookingSlot(page);
}

async function tryToBook(
  page: Page
): Promise<BookingResult> {
  const successMessage = page.getByTestId(
    "BookingConfirmModal-success"
  );

  const errorMessage = page.getByTestId(
    "BookingConfirmModal-error"
  );

  await page
    .getByTestId("BookingConfirmModal-confirm")
    .click();

  await expect(
    successMessage.or(errorMessage)
  ).toBeVisible({
    timeout: 15_000,
  });

  if (
    await errorMessage
      .isVisible()
      .catch(() => false)
  ) {
    return {
      success: false,
      error: await errorMessage.textContent(),
    };
  }

  return {
    success: true,
    error: null,
  };
}

// -------------------- TEST --------------------

test(
  "race condition: три пользователя одновременно бронируют один слот",
  async ({ browser }) => {
    const runId = Date.now();
    const skillTag = `Playwright-race-${runId}`;

    // -------------------- USERS --------------------

    const host: User = {
      name: "Хост Автотест",
      email: `host-${runId}@example.com`,
      password: "testpass123",
    };

    const petya: User = {
      name: "Петя Автотест",
      email: `petya-${runId}@example.com`,
      password: "testpass123",
    };

    const vasya: User = {
      name: "Вася Автотест",
      email: `vasya-${runId}@example.com`,
      password: "testpass123",
    };

    const katya: User = {
      name: "Катя Автотест",
      email: `katya-${runId}@example.com`,
      password: "testpass123",
    };

    // -------------------- TEST USERS --------------------

    const hostTestUser = await createTestUser(
      browser,
      host
    );

    const petyaTestUser = await createTestUser(
      browser,
      petya
    );

    const vasyaTestUser = await createTestUser(
      browser,
      vasya
    );

    const katyaTestUser = await createTestUser(
      browser,
      katya
    );

    // -------------------- HOST --------------------

    await test.step(
      "Хост: регистрируется в PomidorQA",
      async () => {
        await registerUser(
          hostTestUser.page,
          hostTestUser.user
        );

        await expect(
          hostTestUser.page
        ).toHaveURL(/\/pomidorqa\/?$/);
      }
    );

    await test.step(
      "Хост: добавляет навык «могу помочь»",
      async () => {
        await addSkill(
          hostTestUser.page,
          skillTag
        );

        await expect(
          hostTestUser.page.getByTestId(
            "PomidorqaProfile-can-help-skills"
          )
        ).toContainText(skillTag);
      }
    );

    await test.step(
      "Хост: добавляет свободный слот на завтра",
      async () => {
        const tomorrow = new Date(
          Date.now() + 24 * 60 * 60 * 1000
        );

        const date = tomorrow
          .toISOString()
          .slice(0, 10);

        await addSlot(
          hostTestUser.page,
          date,
          "12:30"
        );

        await expect(
          hostTestUser.page
            .getByTestId("PomidorqaSlots-card")
            .first()
        ).toBeVisible();
      }
    );

    // -------------------- GUESTS --------------------

    await test.step(
      "Гости: регистрируются",
      async () => {
        await Promise.all([
          registerUser(
            petyaTestUser.page,
            petyaTestUser.user
          ),

          registerUser(
            vasyaTestUser.page,
            vasyaTestUser.user
          ),

          registerUser(
            katyaTestUser.page,
            katyaTestUser.user
          ),
        ]);

        await Promise.all([
          expect(
            petyaTestUser.page
          ).toHaveURL(/\/pomidorqa\/?$/),

          expect(
            vasyaTestUser.page
          ).toHaveURL(/\/pomidorqa\/?$/),

          expect(
            katyaTestUser.page
          ).toHaveURL(/\/pomidorqa\/?$/),
        ]);
      }
    );

    // -------------------- PREPARE RACE CONDITION --------------------

    await test.step(
      "Гости: находят хоста и выбирают один и тот же слот",
      async () => {
        await Promise.all([
          prepareBooking(
            petyaTestUser.page,
            skillTag,
            host.name
          ),

          prepareBooking(
            vasyaTestUser.page,
            skillTag,
            host.name
          ),

          prepareBooking(
            katyaTestUser.page,
            skillTag,
            host.name
          ),
        ]);
      }
    );

    // -------------------- RACE CONDITION --------------------

    await test.step(
      "Гости: одновременно пытаются забронировать слот",
      async () => {
        const results = await Promise.all([
          tryToBook(petyaTestUser.page),
          tryToBook(vasyaTestUser.page),
          tryToBook(katyaTestUser.page),
        ]);

        const successfulBookings =
          results.filter(
            (result) => result.success
          );

        const failedBookings =
          results.filter(
            (result) => !result.success
          );

        expect(successfulBookings).toHaveLength(1);
        expect(failedBookings).toHaveLength(2);
      }
    );

    // -------------------- CLEANUP --------------------

    await hostTestUser.context.close();
    await petyaTestUser.context.close();
    await vasyaTestUser.context.close();
    await katyaTestUser.context.close();
  }
);