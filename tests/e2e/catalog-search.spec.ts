import { test, expect, type BrowserContext } from '@playwright/test';
import { makeUser, registerUser, addDate, type TestUser } from '../helpers/user';
import { ProfilePage } from '../pages/ProfilePage';
import { BookingPage } from '../pages/BookingPage';

test.describe('Каталог: поиск по навыку', () => {
  let host: TestUser;
  let guest: TestUser;
  let skillTag: string;
  let hostContext: BrowserContext;
  let guestContext: BrowserContext;
  let hostProfile: ProfilePage;
  let hostBooking: BookingPage;
  let guestBooking: BookingPage;

  test.beforeEach(async ({ browser }) => {
    const runId = Date.now();
    host = makeUser('host', runId);
    guest = makeUser('guest', runId);
    skillTag = `Playwright-search-${runId}`;

    hostContext = await browser.newContext();
    guestContext = await browser.newContext();
    const hostPage = await hostContext.newPage();
    const guestPage = await guestContext.newPage();

    hostProfile = new ProfilePage(hostPage);
    hostBooking = new BookingPage(hostPage);
    guestBooking = new BookingPage(guestPage);

    await registerUser(hostPage, host);
    await registerUser(guestPage, guest);
  });

  test.afterEach(async () => {
    await hostContext.close();
    await guestContext.close();
  });

  test('по навыку находится участник со свободным слотом', async () => {
    await test.step('Хост: добавляет навык "Могу помочь"', async () => {
      await hostProfile.goto();
      await hostProfile.addSkill(skillTag, 'can_help');
    });

    await test.step('Навык появился в блоке "Могу помочь"', async () => {
      await expect(hostProfile.canHelpSkills).toContainText(skillTag);
    });

    await test.step('Хост: добавляет свободный слот на завтра', async () => {
      await hostProfile.goToSlots();
      const date = addDate();
      await hostProfile.addSlot(date, '12:00');
    });

    await test.step('Слот появился в списке', async () => {
      await expect(hostBooking.slotsCard.first()).toBeVisible();
    });

    await test.step('Гость: открывает каталог', async () => {
      await guestBooking.openCatalog();
    });

    await test.step('Гость: ищет по навыку хоста', async () => {
      await guestBooking.searchInCatalog(skillTag);
    });

    await test.step('Гость видит карточку хоста в выдаче', async () => {
      await expect(guestBooking.personCardByName(host.name)).toBeVisible();
    });

    await test.step('Гость: открывает карточку хоста', async () => {
      await guestBooking.openPersonCard(host.name);
    });

    await test.step('Карточка хоста открыта', async () => {
      await expect(guestBooking.personName).toHaveText(host.name);
    });

    await test.step('На карточке есть календарь со слотами', async () => {
      await expect(guestBooking.calendarDay.first()).toBeVisible({ timeout: 10_000 });
    });
  });

  test('по навыку без совпадений выдача пустая', async () => {
    const missingTag = `NoSuchSkill-${Date.now()}`;

    await test.step('Гость: открывает каталог', async () => {
      await guestBooking.openCatalog();
    });

    await test.step('Гость: ищет несуществующий навык', async () => {
      await guestBooking.searchInCatalog(missingTag);
    });

    await test.step('Показалось пустое состояние выдачи', async () => {
      await expect(guestBooking.catalogEmpty).toBeVisible();
    });

    await test.step('Карточек в выдаче нет', async () => {
      await expect(guestBooking.personCards).toHaveCount(0);
    });
  });

  test('собственная карточка не видна в каталоге', async () => {
    await test.step('Хост: добавляет навык "Могу помочь"', async () => {
      await hostProfile.goto();
      await hostProfile.addSkill(skillTag, 'can_help');
    });

    await test.step('Навык появился в блоке "Могу помочь"', async () => {
      await expect(hostProfile.canHelpSkills).toContainText(skillTag);
    });

    await test.step('Хост: добавляет свободный слот на завтра', async () => {
      await hostProfile.goToSlots();
      const date = addDate();
      await hostProfile.addSlot(date, '12:00');
    });

    await test.step('Слот появился в списке', async () => {
      await expect(hostBooking.slotsCard.first()).toBeVisible();
    });

    await test.step('Гость: открывает каталог', async () => {
      await guestBooking.openCatalog();
    });

    await test.step('Гость: ищет по навыку хоста', async () => {
      await guestBooking.searchInCatalog(skillTag);
    });

    await test.step('Контроль: гость видит карточку хоста', async () => {
      await expect(guestBooking.personCardByName(host.name)).toBeVisible();
    });

    await test.step('Хост: открывает каталог', async () => {
      await hostBooking.openCatalog();
    });

    await test.step('Хост: ищет по своему навыку', async () => {
      await hostBooking.searchInCatalog(skillTag);
    });

    await test.step('У хоста своя карточка не находится', async () => {
      await expect(hostBooking.catalogEmpty).toBeVisible();
    });

    await test.step('Карточек в выдаче нет', async () => {
      await expect(hostBooking.personCards).toHaveCount(0);
    });
  });
});
