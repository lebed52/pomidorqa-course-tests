import { test, expect, type Page } from "@playwright/test";
import { text } from "node:stream/consumers";

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
  await page.locator('#pomidorqa-register-name').fill(user.name);
  await page.locator('#pomidorqa-register-email').fill(user.email);
  await page.locator('#pomidorqa-register-password').fill(user.password);
  await page.getByRole('button', { name: 'Зарегистрироваться' }).click();
  await page.waitForTimeout(2_000);
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
    await hostPage.getByPlaceholder('Например: Playwright, SQL, собеседования').fill(skillTag);
    await hostPage.getByLabel('Тип').selectOption("can_help");
    await hostPage.getByRole('button', { name: 'Добавить' }).click();
    await expect(hostPage.getByRole('button', { name: skillTag })).toContainText(skillTag);
  });

  await test.step("Хост: добавляет свободный слот на завтра", async () => {
    await hostPage.goto("/pomidorqa/profile/slots");
    const tomorrow = new Date(Date.now() + 24 * 60 * 60 * 1000);
    const date = tomorrow.toISOString().slice(0, 10);
    await hostPage.locator('input[name="date"][type="date"]').fill(date);
    await hostPage.locator('input[name="time"][type="time"]').fill("12:00");
    await hostPage.getByRole('button', { name: 'Добавить слот' }).click();
    await expect(hostPage.locator('[data-slot-id]').first()).toBeVisible();
  });

  await test.step("Гость: регистрируется отдельным аккаунтом", async () => {
    await registerUser(guestPage, guest);
  });

  await test.step("Гость: ищет хоста в каталоге по навыку (сценарий 9)", async () => {
    await guestPage.locator('#pomidorqa-catalog-skill-filter').fill(skillTag);
    await guestPage.getByRole('button', { name: 'Найти' }).click();
    await expect(
      guestPage.getByTestId('person-card').filter({ hasText: host.name })).toBeVisible();
  });

  await test.step("Гость: открывает карточку хоста", async () => {
    await guestPage.getByTestId('person-card').filter({ hasText: host.name }).click();
    await expect(guestPage.getByRole('heading', { name: host.name })).toBeVisible();
  });

  await test.step("Гость: кликает по дню и времени в календаре слотов", async () => {
    await expect(async () => {
      const dayChip = guestPage.locator("[data-date]").first();
      if (!(await dayChip.isVisible().catch(() => false))) {
        await guestPage.reload();
      }
      await expect(dayChip).toBeVisible();
    }).toPass({ timeout: 6_000 });

    await guestPage.locator('button[data-date]').first().click();
    await guestPage.locator('button[data-slot-id]').first().click();
    await expect(guestPage.getByRole('dialog', {name: 'Подтвердить бронирование?'})).toBeVisible();
  });

  // Важно для разбора ДЗ 4: модалку guest2 открываем ДО confirm у guest.
  // Пока слот в UI ещё свободен — оба «человек открыл и отошёл».
  await test.step("Гость2: регистрируется и тоже открывает окно бронирования на тот же слот", async () => {
    await registerUser(guest2Page, guest2);

    await guest2Page.locator('#pomidorqa-catalog-skill-filter').fill(skillTag);
    await guest2Page.getByRole('button', { name: 'Найти' }).click();
    await guest2Page.getByTestId("person-card").filter({ hasText: host.name }).click();
    await expect(guest2Page.getByRole("heading", { name: host.name })).toBeVisible();

    await expect(async () => {
      const dayChip = guest2Page.locator("[data-date]").first();
      if (!(await dayChip.isVisible().catch(() => false))) {
        await guest2Page.reload();
      }
      await expect(dayChip).toBeVisible();
    }).toPass({ timeout: 10_000 });

    await guest2Page.locator('button[data-date]').first().click();
    await guestPage.locator('button[data-slot-id]').first().click();
    await expect(guest2Page.getByRole('dialog', {name: 'Подтвердить бронирование?'})).toBeVisible();
  });

  await test.step("Гость: подтверждает бронирование первым — успех", async () => {
    await guestPage.getByRole('dialog', {name: 'Подтвердить бронирование?'}).getByRole('button', { name: 'Подтвердить' }).click();
    const success = guestPage.getByText('Забронировано!');
    const error = guestPage.getByRole('dialog').getByRole('alert');
    await expect(success.or(error)).toBeVisible({ timeout: 15_000 });
    if (await error.isVisible().catch(() => false)) {
      throw new Error(`Бронирование не удалось: ${await error.textContent()}`);
    }
  });

  await test.step("Гость2: пытается забронировать тот же слот вторым — видит ошибку", async () => {
    await guest2Page.getByRole('dialog', {name: 'Подтвердить бронирование?'}).locator('button[type="submit"]').click();

    const success2 = guest2Page.getByText('Забронировано!');
    const error2 = guest2Page.getByRole('dialog').getByRole('alert');
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
      const card = guestPage.getByTestId("upcoming-meetings").getByText(host.name);
    }).toPass({ timeout: 10_000 });
  });

  await test.step("Хост: тоже видит это бронирование в своих «Мои встречи»", async () => {
    await expect(async () => {
      await hostPage.goto("/pomidorqa/bookings");
      const card = hostPage.getByTestId("upcoming-meetings").getByText(host.name);
    }).toPass({ timeout: 10_000 });
  });

  await hostContext.close();
  await guestContext.close();
  await guest2Context.close();
});
