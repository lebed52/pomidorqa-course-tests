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

const getRegisterName = (page: Page) => page.getByLabel("Имя");
const getRegisterEmail = (page: Page) => page.getByLabel("Email");
const getRegisterPassword = (page: Page) => page.locator("#pomidorqa-register-password");
const getRegisterSubmit = (page: Page) => page.getByRole("button", {name: "Зарегистрироваться"});

const getSkillInput = (page: Page) => page.getByLabel("Навык");
const getSkillType = (page: Page) => page.getByLabel("Тип");
const getSkillButton = (page: Page) => page.getByRole("button", {name: "Добавить"});
const getCanHelpSkill = (page: Page, skill: string) => page.getByText(skill);

const getSlotsDate = (page: Page) => page.getByLabel("Дата");
const getSlotsTime = (page: Page) => page.getByLabel("Время начала");
const getSlotsButton = (page: Page) => page.getByRole("button", {name: "Добавить слот"});
const getFreeSlotsChip = (page: Page) => page.locator('[data-slot-status="free"]').first();

const getFilterInput = (page: Page) => page.getByPlaceholder("Playwright, SQL, собеседования...");
const getFilterButton = (page: Page) => page.getByRole("button", {name: "Найти"});

const getCatalogCard = (page: Page) =>
    page.locator('xpath=//*[@data-testid="person-card"]');
const getPersonName = (page: Page, name: string) =>
    page.getByRole("heading", { name });

const getBookingDay = (page: Page) =>
    page.getByLabel("Дни со слотами").getByRole("button").first();
const getBookingTime = (page: Page) =>
    page.getByLabel("Время слотов").getByRole("button").first();
const getBookingConfirm = (page: Page) => page.getByRole("dialog");
const getBookingConfirmButton = (page: Page) => page.getByRole("button", {name: "Подтвердить"});
const getBookingCard = (page: Page) => page.getByTestId("upcoming-meetings");

const success = (page: Page) => page.getByText("Забронировано");
const error = (page: Page) => page.getByText("забронировали");

async function registerUser(page: Page, user: TestUser) {
  await page.goto("/pomidorqa/auth/register");
  await getRegisterName(page).fill(user.name);
  await getRegisterEmail(page).fill(user.email);
  await getRegisterPassword(page).fill(user.password);
  await getRegisterSubmit(page).click();
  await expect(page).toHaveURL(/\/pomidorqa\/?$/, { timeout: 15_000 });

}
test("основной путь + гонка за слот: регистрация → навык → слот → поиск в каталоге → бронирование → «Мои встречи» у обоих → второй гость видит ошибку", async ({
  browser,
})  => {
  const runId = Date.now();
  const skillTag = `Playwright-demo-${runId}`;
  const host = makeUser("host", runId);
  const guest = makeUser("guest", runId);

  test.setTimeout(120_000);

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
    await getSkillInput(hostPage).fill(skillTag);
    await getSkillType(hostPage).selectOption("can_help");
    await getSkillButton(hostPage).click();
    await expect(getCanHelpSkill(hostPage, skillTag)).toBeVisible();
  });

  await test.step("Хост: добавляет свободный слот на завтра", async () => {
    await hostPage.goto("/pomidorqa/profile/slots");
    const tomorrow = new Date(Date.now() + 24 * 60 * 60 * 1000);
    const date = tomorrow.toISOString().slice(0, 10);
    await getSlotsDate(hostPage).fill(date);
    await getSlotsTime(hostPage).fill("12:00");
    await getSlotsButton(hostPage).click();
    await expect(getFreeSlotsChip(hostPage)).toBeVisible();
  });

  await test.step("Гость: регистрируется отдельным аккаунтом", async () => {
    await registerUser(guestPage, guest);
  });

  await test.step("Гость: ищет хоста в каталоге по навыку (сценарий 9)", async () => {
    await getFilterInput(guestPage).fill(skillTag);
    await getFilterButton(guestPage).click();
    await expect(
      getCatalogCard(guestPage).filter({ hasText: host.name })
    ).toBeVisible();
  });

  await test.step("Гость: открывает карточку хоста", async () => {
    await getCatalogCard(guestPage).filter({ hasText: host.name }).getByText(host.name).click();
    await expect(getPersonName(guestPage, host.name)).toBeVisible();
  });

  await test.step("Гость: кликает по дню и времени в календаре слотов", async () => {
    await expect(async () => {
      const dayChip = getBookingDay(guestPage);
      if (!(await dayChip.isVisible().catch(() => false))) {
        await guestPage.reload();
      }
      await expect(dayChip).toBeVisible();
    }).toPass({ timeout: 10_000 });

    await getBookingDay(guestPage).click();
    await getBookingTime(guestPage).click();
    await expect(getBookingConfirm(guestPage)).toBeVisible();
  });
  // Важно для разбора ДЗ 4: модалку guest2 открываем ДО confirm у guest.
  // Пока слот в UI ещё свободен — оба «человек открыл и отошёл».

  await test.step("Гость2: регистрируется и тоже открывает окно бронирования на тот же слот", async () => {
    await registerUser(guest2Page, guest2);

    await getFilterInput(guest2Page).fill(skillTag);
    await getFilterButton(guest2Page).click();
    await getCatalogCard(guest2Page).filter({ hasText: host.name }).getByText(host.name).click();
    await expect(getPersonName(guest2Page, host.name)).toBeVisible();

    await expect(async () => {
      const dayChip = getBookingDay(guest2Page);
      if (!(await dayChip.isVisible().catch(() => false))) {
        await guest2Page.reload();
      }
      await expect(dayChip).toBeVisible();
    }).toPass({ timeout: 10_000 });

    await getBookingDay(guest2Page).click();
    await getBookingTime(guest2Page).click();
    await expect(getBookingConfirm(guest2Page)).toBeVisible();
  });
  await test.step("Гость: подтверждает бронирование первым — успех", async () => {
    await getBookingConfirmButton(guestPage).click();
    await expect(success(guestPage).or(error(guestPage))).toBeVisible({ timeout: 15_000 });
    if (await error(guestPage).isVisible().catch(() => false)) {
      throw new Error(`Бронирование не удалось: ${await error(guestPage).textContent()}`);
    }
  });

  await test.step("Гость2: пытается забронировать тот же слот вторым — видит ошибку", async () => {
    await getBookingConfirmButton(guest2Page).click();
    await expect(success(guest2Page).or(error(guest2Page))).toBeVisible({ timeout: 15_000 });

    // Полярность наоборот относительно гостя 1: ошибка — ожидаемый результат
    if (await success(guest2Page).isVisible().catch(() => false)) {
      throw new Error("Слот должен был быть занят, но бронирование прошло успешно");
    }
    await expect(error(guest2Page)).toBeVisible();
  });

  await test.step("Гость: видит бронирование в разделе «Мои встречи»", async () => {
    await expect(async () => {
      await guestPage.goto("/pomidorqa/bookings");
      await expect(getBookingCard(guestPage).filter({ hasText: host.name } )).toBeVisible();
    }).toPass({ timeout: 10_000 });
  });

  await test.step("Хост: тоже видит это бронирование в своих «Мои встречи»", async () => {
    await expect(async () => {
      await hostPage.goto("/pomidorqa/bookings");
      await expect(getBookingCard(hostPage).filter({ hasText: guest.name })).toBeVisible();
    }).toPass({ timeout: 10_000 });
  });

  await hostContext.close();
  await guestContext.close();
  await guest2Context.close();
});
