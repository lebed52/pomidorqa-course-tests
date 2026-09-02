import { test, expect, type Page } from "@playwright/test";
import { makeUser, registerUser, ROUTES } from "../helpers/user";
import { ProfilePage } from "../pages/profile-page";  
import { SlotsPage } from "../pages/slots-page";
import { PeoplePage } from "../pages/people-page";
import { BookingPage, catalogLoc } from "../pages/bookings-page";

//POMIDORQA_BASE_URL=http://localhost:3000 npx playwright test --project=e2e tests/e2e/booking-flow.spec.ts

test.describe("Длинные e2e-сценарии, включающие основной путь", () => {
  let profilePage: ProfilePage;
  let slotsPage: SlotsPage;
  let peoplePageGuest: PeoplePage;
  let peoplePageGuest2: PeoplePage;
  let bookingPageGuest: BookingPage;
  let bookingPageGuest2: BookingPage;
  let bookingPageHost: BookingPage;

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
    await hostPage.goto(ROUTES.profile);
    profilePage = new ProfilePage(hostPage);
    await profilePage.addCanHelpSkill(skillTag);
    await expect(profilePage.canHelpSkills).toContainText(skillTag);
  });

  await test.step("Хост: добавляет свободный слот на завтра", async () => {
    await hostPage.goto(ROUTES.slots);
    slotsPage = new SlotsPage(hostPage);
    await slotsPage.addSlotForTomorrow("12:00");
    await slotsPage.addSubmit.click();
    await expect(slotsPage.card.first()).toBeVisible();
  });

  await test.step("Гость: регистрируется отдельным аккаунтом", async () => {
    await registerUser(guestPage, guest);
  });

  await test.step("Гость: ищет хоста в каталоге по навыку и открывает карточку", async () => {
    peoplePageGuest = new PeoplePage(guestPage);
    bookingPageGuest = new BookingPage(guestPage);
    await bookingPageGuest.searchBySkill(skillTag);
    await catalogLoc(guestPage).card.filter({ hasText: host.name }).click();
    await expect(peoplePageGuest.personName).toHaveText(host.name);
  });

  await test.step("Гость: кликает по дню и времени в календаре слотов", async () => {
    peoplePageGuest = new PeoplePage(guestPage);
    await expect(async () => {
      const dayChip = peoplePageGuest.calendarDay.first();
      if (!(await dayChip.isVisible().catch(() => false))) {
        await guestPage.reload();
      }
      await expect(dayChip).toBeVisible();
    }).toPass({ timeout: 10_000 });

    await peoplePageGuest.calendarDay.first().click();
    await peoplePageGuest.calendarTime.first().click();
    await expect(peoplePageGuest.confirmDialog).toBeVisible();
  });

  // Модалку guest2 открываем ДО confirm у guest.
  // Пока слот в UI ещё свободен — оба «человек открыл и отошёл».
  await test.step("Гость2: регистрируется", async () => {
    await registerUser(guest2Page, guest2);
  });

  await test.step("Гость2: ищет хоста в каталоге по навыку и открывает карточку", async () => {
    peoplePageGuest2 = new PeoplePage(guest2Page);
    bookingPageGuest2 = new BookingPage(guest2Page);
    await bookingPageGuest2.searchBySkill(skillTag);
    await catalogLoc(guest2Page).card.filter({ hasText: host.name }).click();
    await expect(peoplePageGuest2.personName).toHaveText(host.name);
  });

  await test.step("Гость2: кликает по дню и времени в календаре слотов", async () => {
    peoplePageGuest2 = new PeoplePage(guest2Page);
    await expect(async () => {
      const dayChip = peoplePageGuest2.calendarDay.first();
      if (!(await dayChip.isVisible().catch(() => false))) {
        await guest2Page.reload();
      }
      await expect(dayChip).toBeVisible();
    }).toPass({ timeout: 10_000 });

    await peoplePageGuest2.calendarDay.first().click();
    await peoplePageGuest2.calendarTime.first().click();
    await expect(peoplePageGuest2.confirmDialog).toBeVisible();
  });

  await test.step("Гость: подтверждает бронирование первым — успех", async () => {
    peoplePageGuest = new PeoplePage(guestPage);
    await peoplePageGuest.confirmButton.click();
    const success = peoplePageGuest.confirmSuccess;
    const error = peoplePageGuest.confirmError;
    await expect(success.or(error)).toBeVisible({ timeout: 15_000 });
    if (await error.isVisible().catch(() => false)) {
      throw new Error(`Бронирование не удалось: ${await error.textContent()}`);
    }
  });

  await test.step("Гость2: пытается забронировать тот же слот вторым — видит ошибку", async () => {
    peoplePageGuest2 = new PeoplePage(guest2Page);
    await peoplePageGuest2.confirmButton.click();

    const success2 = peoplePageGuest2.confirmSuccess;
    const error2 = peoplePageGuest2.confirmError;
    await expect(success2.or(error2)).toBeVisible({ timeout: 15_000 });

    // Полярность наоборот относительно гостя 1: ошибка — ожидаемый результат
    if (await success2.isVisible().catch(() => false)) {
      throw new Error("Слот должен был быть занят, но бронирование прошло успешно");
    }
    await expect(error2).toBeVisible();
  });

  await test.step("Гость: видит бронирование в разделе «Мои встречи»", async () => {
    bookingPageGuest = new BookingPage(guestPage);
    await expect(async () => {
      await guestPage.goto(ROUTES.bookings);
      await expect(bookingPageGuest.cardName).toHaveText(host.name);
    }).toPass({ timeout: 10_000 });
  });

  await test.step("Хост: тоже видит это бронирование в своих «Мои встречи»", async () => {
    bookingPageHost = new BookingPage(hostPage);
    await expect(async () => {
      await hostPage.goto(ROUTES.bookings);
      await expect(bookingPageHost.cardName).toHaveText(guest.name);
    }).toPass({ timeout: 10_000 });
  });

  await hostContext.close();
  await guestContext.close();
  await guest2Context.close();
});

})
