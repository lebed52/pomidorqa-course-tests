import { test, expect} from "@playwright/test";
import {makeUser} from "../helpers/user";
import {RegistrationPage} from "../pages/RegistrationPage";
import {ProfilePage} from "../pages/ProfilePage";
import {BookingPage} from "../pages/BookingPage";

// E2E-уровень пирамиды: реальный браузер на живом стенде aiqa.su/pomidorqa.
// После ДЗ Урока 4: guest2 открывает тот же слот и должен увидеть ошибку.
// host/guest уже через registerUser; регистрация guest2 пока инлайн — это заготовка к ДЗ Урока 5.
//POMIDORQA_BASE_URL=http://localhost:3000 npx playwright test --project=e2e tests/e2e/booking-flow.spec.ts


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

  //Объявление экземпляров страниц
  const hostProfilePage = new ProfilePage(hostPage);

  const hostBookingPage = new BookingPage(hostPage);
  const guestBookingPage = new BookingPage(guestPage);
  const guest2BookingPage = new BookingPage(guest2Page);

  await test.step("Хост: регистрируется в PomidorQA", async () => {
    const registrationPage = new RegistrationPage(hostPage);
    await registrationPage.registerUser(hostPage, host);
  });
 
  await test.step('Хост: добавляет навык «могу помочь» в профиле', async () => {
    await hostPage.goto("/pomidorqa/profile");
    await hostProfilePage.skillInput.fill(skillTag);
    await hostProfilePage.skillTypeSelect.selectOption("can_help");
    await hostProfilePage.addSkillButton.click();
    await expect(hostProfilePage.canHelpSkills).toContainText(skillTag);
  });

  await test.step("Хост: добавляет свободный слот на завтра", async () => {
    await hostPage.goto("/pomidorqa/profile/slots");
    const tomorrow = new Date(Date.now() + 24 * 60 * 60 * 1000);
    const date = tomorrow.toISOString().slice(0, 10);
    await hostBookingPage.slotsDateInput.fill(date);
    await hostBookingPage.slotsTimeInput.fill("12:00");
    await hostBookingPage.slotsAddSubmit.click();
    await expect(hostBookingPage.slotsCard.first()).toBeVisible();
  });

  await test.step("Гость: регистрируется отдельным аккаунтом", async () => {
    const registrationPage = new RegistrationPage(guestPage);
    await registrationPage.registerUser(guestPage, guest);
  });

  await test.step("Гость: ищет хоста в каталоге по навыку (сценарий 9)", async () => {
    await guestBookingPage.catalogFilterInput.fill(skillTag);
    await guestBookingPage.catalogFilterSubmit.click();
    await expect(
        guestBookingPage.catalogCard.filter({ hasText: host.name })
    ).toBeVisible();
  });

  await test.step("Гость: открывает карточку хоста", async () => {
    await guestBookingPage.catalogCard.filter({ hasText: host.name }).click();
    await expect(guestBookingPage.personName).toHaveText(host.name);
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
    const registrationPage = new RegistrationPage(guest2Page);
    await registrationPage.registerUser(guest2Page, guest2);

    await guest2BookingPage.catalogFilterInput.fill(skillTag);
    await guest2BookingPage.catalogFilterSubmit.click();
    await guest2BookingPage.catalogCard.filter({ hasText: host.name }).click();
    await expect(guest2BookingPage.personName).toHaveText(host.name);

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
      const card = guestBookingPage.bookingsCardName;
      await expect(card).toHaveText(host.name);
    }).toPass({ timeout: 10_000 });
  });

  await test.step("Хост: тоже видит это бронирование в своих «Мои встречи»", async () => {
    await expect(async () => {
      await hostPage.goto("/pomidorqa/bookings");
      const card = hostBookingPage.bookingsCardName;
      await expect(card).toHaveText(guest.name);
    }).toPass({ timeout: 10_000 });
  });

  await hostContext.close();
  await guestContext.close();
  await guest2Context.close();
});
