import { test, expect, type BrowserContext, type Page } from '@playwright/test';
import {
  deleteAccountViaApi,
  makeUnique,
  makeUser,
  registerViaApi,
  type TestUser,
} from '../helpers/user';
import { CatalogPage } from '../pages/catalog';
import { ProfilePage } from '../pages/profile';
import { SlotsPage } from '../pages/slots';

test.describe('Каталог: поиск', () => {
  let host: TestUser;
  let skillTag: string;
  let hostContext: BrowserContext;
  let guestContext: BrowserContext;
  let hostPage: Page;
  let guestPage: Page;
  let hostCatalog: CatalogPage;
  let guestCatalog: CatalogPage;

  test.beforeEach(async ({ browser }) => {
    hostContext = await browser.newContext();
    guestContext = await browser.newContext();
    hostPage = await hostContext.newPage();
    guestPage = await guestContext.newPage();

    host = makeUser('host');
    skillTag = makeUnique('Search');

    await registerViaApi(hostContext, host);
    await registerViaApi(guestContext, makeUser('guest'));

    const hostProfile = new ProfilePage(hostPage);
    const hostSlots = new SlotsPage(hostPage);
    hostCatalog = new CatalogPage(hostPage);
    guestCatalog = new CatalogPage(guestPage);

    await hostProfile.open();
    await hostProfile.addSkill(skillTag);
    await expect(hostProfile.canHelpSkills).toContainText(skillTag);

    await hostSlots.open();
    const tomorrow = new Date(Date.now() + 24 * 60 * 60 * 1000);
    await hostSlots.addSlot(tomorrow.toISOString().slice(0, 10), '12:00');

    await guestCatalog.goto();
  });

  test.afterEach(async () => {
    await deleteAccountViaApi(guestContext).catch(() => undefined);
    await deleteAccountViaApi(hostContext).catch(() => undefined);
    await guestContext.close();
    await hostContext.close();
  });

  test('поиск по навыку находит карточку хоста со слотом', async () => {
    await test.step('Гость: ищет хоста по навыку', async () => {
      await guestCatalog.searchBy(skillTag);
    });

    await test.step('В выдаче карточка хоста — ровно одна', async () => {
      await expect(guestCatalog.getPersonCard(host.name)).toBeVisible();
      await expect(guestCatalog.personCard).toHaveCount(1);
    });

    await test.step('Гость: открывает карточку хоста', async () => {
      await guestCatalog.getPersonCard(host.name).click();
    });

    await test.step('Открыт профиль найденного хоста', async () => {
      await expect(guestCatalog.personName).toHaveText(host.name);
    });
  });

  test('пустая выдача и сброс результатов при смене запроса', async () => {
    await test.step('Гость: ищет несуществующий навык', async () => {
      await guestCatalog.searchBy(makeUnique('Nobody-has'));
    });

    await test.step('Выдача пуста — карточек нет', async () => {
      await expect(guestCatalog.emptyResult).toBeVisible();
      await expect(guestCatalog.personCard).toHaveCount(0);
    });

    await test.step('Гость: ищет существующий навык', async () => {
      await guestCatalog.searchBy(skillTag);
    });

    await test.step('Карточка хоста снова одна', async () => {
      await expect(guestCatalog.getPersonCard(host.name)).toBeVisible();
      await expect(guestCatalog.personCard).toHaveCount(1);
    });

    await test.step('Гость: снова ищет несуществующий навык', async () => {
      await guestCatalog.searchBy(makeUnique('Nobody-has'));
    });

    await test.step('Выдача снова пуста — результаты не накопились', async () => {
      await expect(guestCatalog.emptyResult).toBeVisible();
      await expect(guestCatalog.personCard).toHaveCount(0);
    });
  });

  test('хост без слота не попадает в каталог, а появившись — не видит сам себя', async () => {
    await test.step('Гость: ищет по навыку хоста', async () => {
      await guestCatalog.searchBy(skillTag);
    });

    await test.step('Контроль: гость видит карточку хоста', async () => {
      await expect(guestCatalog.getPersonCard(host.name)).toBeVisible();
    });

    await test.step('Хост: открывает каталог и ищет свой навык', async () => {
      await hostCatalog.goto();
      await hostCatalog.searchBy(skillTag);
    });

    await test.step('Своей карточки в выдаче нет', async () => {
      await expect(hostCatalog.getPersonCard(host.name)).toHaveCount(0);
      await expect(hostCatalog.emptyResult).toBeVisible();
    });
  });
});

test.describe('Каталог: попадание в выдачу зависит от слота', () => {
  let host: TestUser;
  let guest: TestUser;
  let skillTag: string;
  let hostContext: BrowserContext;
  let guestContext: BrowserContext;
  let hostPage: Page;
  let guestPage: Page;
  let hostProfile: ProfilePage;
  let hostSlots: SlotsPage;
  let guestCatalog: CatalogPage;

  test.beforeEach(async ({ browser }) => {
    hostContext = await browser.newContext();
    guestContext = await browser.newContext();
    hostPage = await hostContext.newPage();
    guestPage = await guestContext.newPage();

    host = makeUser('host');
    guest = makeUser('guest');
    skillTag = makeUnique('Search');

    await registerViaApi(hostContext, host);
    await registerViaApi(guestContext, guest);

    hostProfile = new ProfilePage(hostPage);
    hostSlots = new SlotsPage(hostPage);
    guestCatalog = new CatalogPage(guestPage);

    await hostProfile.open();
    await hostProfile.addSkill(skillTag);
    await expect(hostProfile.canHelpSkills).toContainText(skillTag);
  });

  test.afterEach(async () => {
    await deleteAccountViaApi(guestContext).catch(() => undefined);
    await deleteAccountViaApi(hostContext).catch(() => undefined);
    await guestContext.close();
    await hostContext.close();
  });

  test('хост с навыком, но без слота, не виден; после добавления слота появляется', async () => {
    await test.step('Гость: открывает каталог и ищет по навыку — хоста нет', async () => {
      await guestCatalog.goto();
      await guestCatalog.searchBy(skillTag);
      await expect(guestCatalog.emptyResult).toBeVisible();
      await expect(guestCatalog.personCard).toHaveCount(0);
    });

    await test.step('Хост: добавляет свободный слот на завтра', async () => {
      await hostSlots.open();
      const tomorrow = new Date(Date.now() + 24 * 60 * 60 * 1000);
      await hostSlots.addSlot(tomorrow.toISOString().slice(0, 10), '12:00');
    });

    await test.step('Гость: ищет снова — карточка появляется (индекс может запаздывать)', async () => {
      await expect(async () => {
        await guestCatalog.searchBy(skillTag);
        await expect(guestCatalog.getPersonCard(host.name)).toBeVisible();
      }).toPass({ timeout: 15_000 });
    });
  });
});
