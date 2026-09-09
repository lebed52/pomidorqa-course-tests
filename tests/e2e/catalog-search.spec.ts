import { test, expect, type Page } from "@playwright/test";
import { makeUser, registerUser, ROUTES } from "../helpers/user";
import { ProfilePage } from "../pages/profile-page";
import { SlotsPage } from "../pages/slots-page";
import { PeoplePage } from "../pages/people-page";
import { BookingPage, catalogLoc, personCardByName } from "../pages/bookings-page";
import { createUsersContext, createAdditionalContext } from "../helpers/contexts";

// POMIDORQA_BASE_URL=http://localhost:3000 npx playwright test --project=e2e tests/e2e/catalog-search.spec.ts

test.describe("Поиск по каталогу на главной странице", () => {
  let profilePage: ProfilePage;
  let slotsPage: SlotsPage;
  let peoplePageGuest: PeoplePage;
  let peoplePageHost: PeoplePage;
  let bookingPageGuest: BookingPage;
  let bookingPageHost: BookingPage;

  let userContexts: any;
  let runId!: number;
  let host: any;
  let guest: any;

test.beforeEach(async ({ browser }) => {
runId = Date.now();
userContexts = await createUsersContext(browser);
host = makeUser("host", runId);
guest = makeUser("guest", runId + 1);

});

  test("1. Два Хоста с одинаковыми навыками, Гость выполняет поиск, показано 2 карточки", async ({
    browser,
  }) => {
    const {hostContext, guestContext, hostPage, guestPage} = userContexts;
    const host2 = makeUser("host2", runId + 2);
    const skillTag = `Playwright-demo-${runId}`;
    const { additionalContext: host2Context, additionalPage: host2Page } = await createAdditionalContext(browser);

    try {
      await test.step("Хост1: регистрируется в PomidorQA", async () => {
        await registerUser(hostPage, host);
      });

      await test.step('Хост1: добавляет навык «могу помочь» в профиле', async () => {
        await hostPage.goto(ROUTES.profile);
        profilePage = new ProfilePage(hostPage);
        await profilePage.addCanHelpSkill(skillTag);
      });

      await test.step('Навык «могу помочь» в профиле Хоста1 добавлен', async () => {
        await expect(profilePage.canHelpSkills).toContainText(skillTag);
      });

      await test.step("Хост1: добавляет свободный слот на завтра", async () => {
        await hostPage.goto(ROUTES.slots);
        slotsPage = new SlotsPage(hostPage);
        await slotsPage.addSlotForTomorrow("10:00");
      });

      await test.step("Свободный слот у Хоста1 добавлен", async () => {
        await expect(slotsPage.card.first()).toBeVisible();
      });

      await test.step("Хост2: регистрируется в PomidorQA", async () => {
        await registerUser(host2Page, host2);
      });

      await test.step('Хост2: добавляет навык «могу помочь» в профиле', async () => {
        await host2Page.goto(ROUTES.profile);
        profilePage = new ProfilePage(host2Page);
        await profilePage.addCanHelpSkill(skillTag);
      });

      await test.step('Навык «могу помочь» в профиле Хоста2 добавлен', async () => {
        await expect(profilePage.canHelpSkills).toContainText(skillTag);
      });

      await test.step("Хост2: добавляет свободный слот на завтра", async () => {
        await host2Page.goto(ROUTES.slots);
        slotsPage = new SlotsPage(host2Page);
        await slotsPage.addSlotForTomorrow("11:00");
      });

      await test.step("Свободный слот у Хоста2 добавлен", async () => {
        await expect(slotsPage.card.first()).toBeVisible();
      });

      await test.step("Гость: регистрируется отдельным аккаунтом", async () => {
        await registerUser(guestPage, guest);
      });

      await test.step("Гость: ищет в каталоге по навыку", async () => {
        bookingPageGuest = new BookingPage(guestPage);
        await bookingPageGuest.searchBySkill(skillTag);
        // Ждем появления хотя бы одной карточки
        await expect(catalogLoc(guestPage).card.first()).toBeVisible({ timeout: 10000 });
      });

      await test.step("В результатах поиска отображаются обе карточки хостов", async () => {
        await expect(catalogLoc(guestPage).card).toHaveCount(2, { timeout: 10000 });
        await expect(catalogLoc(guestPage).card.filter({ hasText: host.name })).toHaveCount(1);
        await expect(catalogLoc(guestPage).card.filter({ hasText: host2.name })).toHaveCount(1);
      });
    } finally {
      await hostContext.close();
      await host2Context.close();
      await guestContext.close();
    }
  });

  test("2. У Гостя заполнен навык «Хочу разобрать», Хост находит Гостя по нему", async ({
    browser,
  }) => {
   
    const {hostContext, guestContext, hostPage, guestPage} = userContexts;
    const skillTag = `Playwright-learn-${runId}`;

    try {
      await test.step("Гость: регистрируется в PomidorQA", async () => {
        await registerUser(guestPage, guest);
      });

      await test.step('Гость: добавляет навык «хочу разобрать» в профиле', async () => {
        await guestPage.goto(ROUTES.profile);
        profilePage = new ProfilePage(guestPage);
        await profilePage.skillInput.fill(skillTag);
        await profilePage.skillTypeSelect.selectOption("want_to_learn");
        await profilePage.addSkillButton.click();
      });

      await test.step('Навык «хочу разобрать» в профиле Гостя добавлен', async () => {
        await expect(profilePage.skillChip(skillTag)).toBeVisible();
      });

      await test.step("Гость: добавляет свободный слот на завтра", async () => {
        await guestPage.goto(ROUTES.slots);
        slotsPage = new SlotsPage(guestPage);
        await slotsPage.addSlotForTomorrow("10:00");
      });

      await test.step("Свободный слот у Гостя добавлен", async () => {
        await expect(slotsPage.card.first()).toBeVisible();
      });

      await test.step("Хост: регистрируется отдельным аккаунтом", async () => {
        await registerUser(hostPage, host);
      });

      await test.step("Хост: ищет в каталоге по навыку Гостя", async () => {
        bookingPageHost = new BookingPage(hostPage);
        await bookingPageHost.searchBySkill(skillTag);
        await expect(catalogLoc(hostPage).card.first()).toBeVisible({ timeout: 10000 });
      });

      await test.step("Хост находит карточку Гостя в результатах поиска", async () => {
        await expect(catalogLoc(hostPage).card).toHaveCount(1);
        await expect(catalogLoc(hostPage).card).toContainText(guest.name);
      });

      await test.step("Хост открывает карточку Гостя", async () => {
        await personCardByName(hostPage, guest.name);
        peoplePageHost = new PeoplePage(hostPage);
        await expect(peoplePageHost.personName).toHaveText(guest.name);
      });
    } finally {
      await hostContext.close();
      await guestContext.close();
    }
  });

  test("3. Гость находит Хоста по навыку, бронирует встречу, после этого поиск ничего не находит", async ({
    browser,
  }) => {

    const {hostContext, guestContext, hostPage, guestPage} = userContexts;
    const skillTag = `Playwright-demo-${runId}`;

    try {
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

      await test.step("Гость: ищет Хоста в каталоге по навыку", async () => {
        bookingPageGuest = new BookingPage(guestPage);
        await bookingPageGuest.searchBySkill(skillTag);
        await expect(catalogLoc(guestPage).card.first()).toBeVisible({ timeout: 10000 });
      });

      await test.step("В результатах поиска отображается карточка Хоста", async () => {
        await expect(catalogLoc(guestPage).card).toHaveCount(1);
        await expect(catalogLoc(guestPage).card).toContainText(host.name);
      });

      await test.step("Гость: открывает карточку Хоста", async () => {
        await personCardByName(guestPage, host.name);
        peoplePageGuest = new PeoplePage(guestPage);
        await expect(peoplePageGuest.personName).toHaveText(host.name);
      });

      await test.step("Гость: выбирает день и время в календаре слотов", async () => {
        peoplePageGuest = new PeoplePage(guestPage);
        await expect(async () => {
          const dayChip = peoplePageGuest.calendarDay.first();
          if (!(await dayChip.isVisible().catch(() => false))) {
            await guestPage.reload();
          }
          await expect(dayChip).toBeVisible();
          await peoplePageGuest.calendarDay.first().click();
          await peoplePageGuest.calendarTime.first().click();
          await expect(peoplePageGuest.confirmDialog).toBeVisible();
        }).toPass({ timeout: 10_000 });
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

      await test.step("Гость: снова выполняет поиск по тому же навыку", async () => {
        await guestPage.goto(ROUTES.title);
        bookingPageGuest = new BookingPage(guestPage);
        await bookingPageGuest.searchBySkill(skillTag);
        // Ждем, чтобы убедиться, что карточки не появляются
        await expect(catalogLoc(guestPage).card).toHaveCount(0, { timeout: 5000 });
      });

      await test.step("Результаты поиска пустые (ни одной карточки)", async () => {
        await expect(catalogLoc(guestPage).card).not.toBeVisible();
      });
    } finally {
      await hostContext.close();
      await guestContext.close();
    }
  });

  test("4. Хост заполняет навык в профиле, ищет по нему, поиск ничего не находит", async ({
    browser,
  }) => {
    
    const skillTag = `Playwright-self-${runId}`;
    const { hostContext, hostPage } = userContexts;
 
    try {
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

      await test.step("Хост: ищет в каталоге по своему навыку", async () => {
        await hostPage.goto(ROUTES.title);
        bookingPageHost = new BookingPage(hostPage);
        await bookingPageHost.searchBySkill(skillTag);
        // Ждем, чтобы убедиться, что карточки не появляются
        await expect(catalogLoc(hostPage).card).toHaveCount(0, { timeout: 5000 });
      });

      await test.step("Поиск не находит карточек (Хост не видит себя)", async () => {
        await expect(catalogLoc(hostPage).card).not.toBeVisible();
      });
    } finally {
      await hostContext.close();
    }
  });
});