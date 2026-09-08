import { test, expect } from '@playwright/test';
import { searchMeet } from '../helpers/searchMeet';
import { makeUnique, makeUser, registerUser } from '../helpers/user';
import { CatalogPage } from '../pages/catalog';
import { ProfilePage } from '../pages/profile';
import { SlotsPage } from '../pages/slots';

test.describe('Каталог: поиск', () => {
  test('поиск по навыку находит карточку хоста со слотом', async ({ browser }) => {
    const { host, skillTag, guestCatalog, close } = await searchMeet(browser);

    try {
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
    } finally {
      await close();
    }
  });

  test('Поиск несуществующего навыка ', async ({ browser }) => {
    const { host, skillTag, guestPage, guestCatalog, close } = await searchMeet(browser);

    try {
      await test.step('Гость: ищет несуществующий навык', async () => {
        await guestCatalog.searchBy(makeUnique('Nobody-has'));
      });

      await test.step('Выдача снова пуста ', async () => {
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

      await test.step('Гость: снова ищет несуществующий навыk', async () => {
        await guestCatalog.searchBy(makeUnique('Nobody-has'));
      });

      await test.step('Выдача снова пуста — результаты не накопились', async () => {
        await expect(guestCatalog.emptyResult).toBeVisible();
        await expect(guestCatalog.personCard).toHaveCount(0);
      });
    } finally {
      await close();
    }
  });

  test('хост без слота не попадает в каталог, а появившись — не видит сам себя', async ({
    browser,
  }) => {
    const runId = Date.now();
    const skillTag = makeUnique('Search');
    const host = makeUser('host', runId);
    const guest = makeUser('guest', runId);

    const hostContext = await browser.newContext();
    const guestContext = await browser.newContext();
    const hostPage = await hostContext.newPage();
    const guestPage = await guestContext.newPage();

    const hostProfile = new ProfilePage(hostPage);
    const hostSlots = new SlotsPage(hostPage);
    const hostCatalog = new CatalogPage(hostPage);
    const guestCatalog = new CatalogPage(guestPage);

    try {
      await test.step('Хост: регистрируется и добавляет навык — без слота', async () => {
        await registerUser(hostPage, host);
        await hostProfile.open();
        await hostProfile.addSkill(skillTag);
      });

      await test.step('Гость: регистрируется отдельным аккаунтом', async () => {
        await registerUser(guestPage, guest);
      });

      await test.step('Гость: ищет по навыку хоста', async () => {
        await guestCatalog.searchBy(skillTag);
      });

      await test.step('Карточки хоста в каталоге нет', async () => {
        await expect(guestCatalog.emptyResult).toBeVisible();
        await expect(guestCatalog.personCard).toHaveCount(0);
      });

      await test.step('Хост: добавляет свободный слот на завтра', async () => {
        await hostSlots.open();
        const tomorrow = new Date(Date.now() + 24 * 60 * 60 * 1000);
        await hostSlots.addSlot(tomorrow.toISOString().slice(0, 10), '12:00');
      });

      await test.step('Гость: ищет по навыку повторно — карточка появляется', async () => {
        await expect(async () => {
          await guestCatalog.searchBy(skillTag);
          await expect(guestCatalog.getPersonCard(host.name)).toBeVisible();
        }).toPass({ timeout: 15_000 });
      });

      await test.step('Хост: ищет свой навык', async () => {
        await hostCatalog.goto();
        await hostCatalog.searchBy(skillTag);
      });

      await test.step('Своей карточки в выдаче нет', async () => {
        await expect(hostCatalog.getPersonCard(host.name)).toHaveCount(0);
        await expect(hostCatalog.emptyResult).toBeVisible();
      });
    } finally {
      await hostContext.close();
      await guestContext.close();
    }
  });
});
