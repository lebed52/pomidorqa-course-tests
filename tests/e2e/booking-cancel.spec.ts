import { test, expect, type Page } from "@playwright/test";
import { makeUser, registerUser, ROUTES } from "../helpers/user";
import { ProfilePage } from "../pages/profile-page";  
import { SlotsPage } from "../pages/slots-page";
import { PeoplePage } from "../pages/people-page";
import { BookingPage, catalogLoc, personCardByName } from "../pages/bookings-page";

//POMIDORQA_BASE_URL=http://localhost:3000 npx playwright test --project=e2e tests/e2e/booking-flow.spec.ts

test.describe("E2e-сценарии с отменой бронирования", () => {
  let profilePage: ProfilePage;
  let slotsPage: SlotsPage;
  let peoplePageGuest: PeoplePage;
  let bookingPageGuest: BookingPage;
  let bookingPageHost: BookingPage;

test("основной путь + отмена: регистрация → навык → слот → поиск в каталоге → бронирование → отмена → в прошедших встречах у обоих", async ({
  browser,
}) => {
  const runId = Date.now();
  const skillTag = `Playwright-demo-${runId}`;
  const host = makeUser("host", runId);
  const guest = makeUser("guest", runId);

  // Два независимых аккаунта = два независимых браузерных контекста
  const hostContext = await browser.newContext();
  const guestContext = await browser.newContext();
  const hostPage = await hostContext.newPage();
  const guestPage = await guestContext.newPage();

  await test.step("Хост: регистрируется в PomidorQA", async () => {
    await registerUser(hostPage, host);
  });
 
  await test.step('Хост: добавляет навык «могу помочь» в профиле', async () => {
    await hostPage.goto(ROUTES.profile);
    profilePage = new ProfilePage(hostPage);
    await profilePage.addCanHelpSkill(skillTag);
  });

  await test.step('Навык «могу помочь» в профиле Хоста добавлен', async () => {
    await expect(profilePage.canHelpSkills).toContainText(skillTag);
  });  

  await test.step("Хост: добавляет свободный слот на завтра", async () => {
    await hostPage.goto(ROUTES.slots);
    slotsPage = new SlotsPage(hostPage);
    await slotsPage.addSlotForTomorrow("12:00");
  });

  await test.step("Свободный слот на завтра у Хоста добавлен", async () => {
    await expect(slotsPage.card.first()).toBeVisible();
  });  

  await test.step("Гость: регистрируется отдельным аккаунтом", async () => {
    await registerUser(guestPage, guest);
  });

  await test.step("Гость: ищет хоста в каталоге по навыку и открывает карточку", async () => {
    peoplePageGuest = new PeoplePage(guestPage);
    bookingPageGuest = new BookingPage(guestPage);
    await bookingPageGuest.searchBySkill(skillTag);
    await personCardByName(guestPage, host.name);
  });

  await test.step("Карточка хоста у Гостя открыта", async () => {
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
  });

  await test.step("У Гостя появилось модальное окно с подтверждением", async () => {
    await expect(peoplePageGuest.confirmDialog).toBeVisible();
  });  

  await test.step("Гость: подтверждает бронирование", async () => {
    peoplePageGuest = new PeoplePage(guestPage);
    await peoplePageGuest.confirmButton.click();
  });

  await test.step("У Гостя бронирование прошло успешно", async () => {
    const success = peoplePageGuest.confirmSuccess;
    const error = peoplePageGuest.confirmError;
    await expect(success.or(error)).toBeVisible({ timeout: 15_000 });
    if (await error.isVisible().catch(() => false)) {
      throw new Error(`Бронирование не удалось: ${await error.textContent()}`);
    }
  });  
  
  await test.step("Хост видит это бронирование в своих «Мои встречи»", async () => {
    bookingPageHost = new BookingPage(hostPage);
    await expect(async () => {
      await hostPage.goto(ROUTES.bookings);
      await expect(bookingPageHost.cardName).toHaveText(guest.name);
    }).toPass({ timeout: 10_000 });
  });

  await test.step("Гость видит это бронирование в своих «Мои встречи»", async () => {
    bookingPageGuest = new BookingPage(guestPage);
    await expect(async () => {
      await guestPage.goto(ROUTES.bookings);
      await expect(bookingPageGuest.cardName).toHaveText(host.name);
    }).toPass({ timeout: 10_000 });
  });

  await test.step("Гость отменяет созданное бронирование", async () => {
    bookingPageGuest = new BookingPage(guestPage);
      await guestPage.goto(ROUTES.bookings);
      await bookingPageGuest.cancelFirstMeeting();
  });  

  await test.step("Гость видит это бронирование в отмененных в «Мои встречи»", async () => {
    bookingPageGuest = new BookingPage(guestPage);
    await expect(async () => {
      await guestPage.goto(ROUTES.bookings);
      await expect(bookingPageGuest.cardNameForCancelled).toHaveText(host.name);
    }).toPass({ timeout: 10_000 });
  });

  await test.step("Хост видит это бронирование в отмененных в «Мои встречи»", async () => {
    bookingPageHost = new BookingPage(hostPage);
    await expect(async () => {
      await hostPage.goto(ROUTES.bookings);
      await expect(bookingPageHost.cardNameForCancelled).toHaveText(guest.name);
    }).toPass({ timeout: 10_000 });
  });

  await hostContext.close();
  await guestContext.close();
});

})
