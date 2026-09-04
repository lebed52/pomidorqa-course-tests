import { test, expect } from '@playwright/test';
import { makeUser, registerUser } from '../helpers/user';
import { ProfilePage } from '../pages/profile';
import { CatalogPage } from '../pages/catalog';
import { BookingPage } from '../pages/booking';
import { SlotsPage } from '../pages/slots';

test('основной путь + гонка за слот: регистрация → навык → слот → поиск в каталоге → бронирование → «Мои встречи» у обоих → второй гость видит ошибку', async ({
  browser,
}) => {
  const runId = Date.now();
  const skillTag = `Playwright-demo-${runId}`;
  const host = makeUser('host', runId);
  const guest = makeUser('guest', runId);
  const guest2 = makeUser('guest2', runId);
  let guestResult: 'success' | 'taken';
  let guest2Result: 'success' | 'taken';

  const hostContext = await browser.newContext();
  const guestContext = await browser.newContext();
  const guest2Context = await browser.newContext();
  const hostPage = await hostContext.newPage();
  const guestPage = await guestContext.newPage();
  const guest2Page = await guest2Context.newPage();

  const hostProfile = new ProfilePage(hostPage);
  const hostSlots = new SlotsPage(hostPage);
  const guestCatalog = new CatalogPage(guestPage);
  const guest2Catalog = new CatalogPage(guest2Page);
  const guestBooking = new BookingPage(guestPage);
  const guest2Booking = new BookingPage(guest2Page);
  const hostBookings = new BookingPage(hostPage);

  await test.step('Хост: регистрируется в PomidorQA', async () => {
    await registerUser(hostPage, host);
  });

  await test.step('Хост: добавляет навык «могу помочь» в профиле', async () => {
    await hostProfile.open();
    await hostProfile.addSkill(skillTag);
  });

  await test.step('Навык появился в блоке «Могу помочь»', async () => {
    await expect(hostProfile.canHelpSkills).toContainText(skillTag);
  });

  await test.step('Хост: добавляет свободный слот на завтра', async () => {
    await hostSlots.open();
    const tomorrow = new Date(Date.now() + 24 * 60 * 60 * 1000);
    const date = tomorrow.toISOString().slice(0, 10);
    await hostSlots.addSlot(date, '12:00');
  });

  await test.step('Слот отображается в списке', async () => {
    await expect(hostSlots.freeSlots).toBeVisible();
  });

  await test.step('Гость: регистрируется отдельным аккаунтом', async () => {
    await registerUser(guestPage, guest);
  });

  await test.step('Гость: ищет хоста в каталоге по навыку (сценарий 9)', async () => {
    await guestCatalog.catalogFilterInput.fill(skillTag);
    await guestCatalog.btnSearch.click();
  });

  await test.step('Карточка хоста найдена в каталоге', async () => {
    await expect(guestCatalog.personCard.filter({ hasText: host.name })).toBeVisible();
  });

  await test.step('Гость: открывает карточку хоста', async () => {
    await guestCatalog.personCard.filter({ hasText: host.name }).click();
  });

  await test.step('Открыта карточка хоста', async () => {
    await expect(guestCatalog.personName).toHaveText(host.name);
  });

  await test.step('Гость: кликает по дню и времени в календаре слотов', async () => {
    await guestBooking.waitForFreeSlot();
    await guestBooking.selectFirstSlot();
  });

  await test.step('Гость2: регистрируется отдельным аккаунтом', async () => {
    await registerUser(guest2Page, guest2);
  });

  await test.step('Гость2: находит и открывает карточку хоста', async () => {
    await guest2Catalog.catalogFilterInput.fill(skillTag);
    await guest2Catalog.btnSearch.click();
    await guest2Catalog.personCard.filter({ hasText: host.name }).click();
  });

  await test.step('Открыта карточка хоста', async () => {
    await expect(guest2Catalog.personName).toHaveText(host.name);
  });

  await test.step('Гость2: кликает по дню и времени в календаре слотов', async () => {
    await guest2Booking.waitForFreeSlot();
    await guest2Booking.selectFirstSlot();
  });

  await test.step('Гость: подтверждает бронирование первым', async () => {
    guestResult = await guestBooking.confirmBooking();
  });

  await test.step('Бронирование гостя подтверждено — слот достался ему', async () => {
    expect(guestResult).toBe('success');
  });

  await test.step('Гость2: пытается забронировать тот же слот вторым', async () => {
    guest2Result = await guest2Booking.confirmBooking();
  });

  await test.step('Бронирование гостя2 не прошло — слот уже занят', async () => {
    expect(guest2Result).toBe('taken');
  });

  await test.step('Гость: видит бронирование в разделе «Мои встречи»', async () => {
    await expect(async () => {
      await guestBooking.openBookings();
      await expect(guestBooking.upcomingSession).toContainText(host.name);
    }).toPass({ timeout: 15_000 });
  });

  await test.step('Хост: тоже видит это бронирование в своих «Мои встречи»', async () => {
    await expect(async () => {
      await hostBookings.openBookings();
      await expect(hostBookings.upcomingSession).toContainText(guest.name);
    }).toPass({ timeout: 15_000 });
  });

  await hostContext.close();
  await guestContext.close();
  await guest2Context.close();
});
