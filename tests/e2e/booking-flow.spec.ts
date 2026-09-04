import { test, expect} from "@playwright/test";
import {makeUser, registerUser} from "../helpers/user";
import {ProfilePage} from "../pages/profile-page";
import {BookingPage} from "../pages/booking-page";

test("основной путь + гонка за слот: регистрация → навык → слот → поиск в каталоге → бронирование → «Мои встречи» у обоих → второй гость видит ошибку", async ({
  browser,
}) => {
  const runId = Date.now();
  const skillTag = `Playwright-demo-${runId}`;
  const host = makeUser("host", runId);
  const guest = makeUser("guest", runId);
  const guest2 = makeUser("guest2", runId);

  const hostContext = await browser.newContext();
  const guestContext = await browser.newContext();
  const guest2Context = await browser.newContext();
  const hostPage = await hostContext.newPage();
  const guestPage = await guestContext.newPage();
  const guest2Page = await guest2Context.newPage();

  const hostProfilePage = new ProfilePage(hostPage);

  const hostBookingPage = new BookingPage(hostPage);
  const guestBookingPage = new BookingPage(guestPage);
  const guest2BookingPage = new BookingPage(guest2Page);

  await test.step("Хост: регистрируется в PomidorQA", async () => {
    await registerUser(hostPage, host);
  });
 
  await test.step('Хост: добавляет навык «могу помочь» в профиле', async () => {
    await hostProfilePage.gotoProfile();
    await hostProfilePage.fillSkillInput(skillTag, "can_help");
  });

  await test.step('У хоста есть навык «могу помочь» в профиле', async () => {
    await expect(hostProfilePage.canHelpSkills).toContainText(skillTag);
    });

  await test.step("Хост: добавляет свободный слот на завтра", async () => {
    await hostProfilePage.gotoSlots();
    const tomorrow = new Date(Date.now() + 24 * 60 * 60 * 1000);
    const date = tomorrow.toISOString().slice(0, 10);

    await hostBookingPage.fillSlotDateAndTimeInput(date, "12:00");
  });

  await test.step('У хоста есть свободный слот на завтра', async () => {
    await expect(hostBookingPage.slotsCard.first()).toBeVisible();;
  });

  await test.step("Гость: регистрируется отдельным аккаунтом", async () => {
    await registerUser(guestPage, guest);
  });

  await test.step("Гость: ищет хоста в каталоге по навыку (сценарий 9)", async () => {
    await guestBookingPage.searchCatalogBySkill(skillTag);
  });

  await test.step("Гость: нашел хоста в каталоге по навыку (сценарий 9)", async () => {
    await expect(
        guestBookingPage.catalogCard.filter({ hasText: host.name })
    ).toBeVisible();
  });

  await test.step("Гость: открывает карточку хоста", async () => {
    await guestBookingPage.catalogCard.filter({ hasText: host.name }).click();
  });

  await test.step("Гость: видит карточку подтвержденную именем хоста", async () => {
    await expect(guestBookingPage.personName).toHaveText(host.name);
  });

  await test.step("Гость: видит день и время в календаре слотов", async () => {
    await expect(async () => {
      const dayChip = guestBookingPage.bookingCalendarDay.first();
      if (!(await dayChip.isVisible().catch(() => false))) {
        await guestPage.reload();
      }
      await expect(dayChip).toBeVisible();
    }).toPass({ timeout: 10_000 });
  });

  await test.step("Гость: кликает по дню и времени в календаре слотов", async () => {
    await guestBookingPage.clickFirstFreeSlot();
  });

  await test.step("Гость: видит подтверждающий диалог", async () => {
    await expect(guestBookingPage.bookingConfirmDialog).toBeVisible();
  });


  await test.step("Гость2: регистрируется отдельным аккаунтом", async () => {
    await registerUser(guest2Page, guest2);
  });

  await test.step("Гость2: открывает карточку хоста", async () => {
    await guest2BookingPage.searchCatalogBySkill(skillTag);
    await guest2BookingPage.catalogCard.filter({ hasText: host.name }).click();
  });

  await test.step("Гость2: видит карточку подтвержденную именем хоста", async () => {
    await expect(guest2BookingPage.personName).toHaveText(host.name);
  });

  await test.step("Гость2: видит окно бронирования на тот же слот", async () => {
    await expect(async () => {
      const dayChip = guest2BookingPage.bookingCalendarDay.first();
      if (!(await dayChip.isVisible().catch(() => false))) {
        await guest2Page.reload();
      }
      await expect(dayChip).toBeVisible();
    }).toPass({ timeout: 10_000 });
  });

  await test.step("Гость 2: кликает по дню и времени в календаре слотов", async () => {
    await guest2BookingPage.clickFirstFreeSlot();
  });

  await test.step("Гость2: тоже видит подтверждающий диалог", async () => {
    await expect(guest2BookingPage.bookingConfirmDialog).toBeVisible();
  });

  await test.step("Гость: нажимает на подтверждение бронирования", async () => {
    await guestBookingPage.bookingConfirmButton.click();
  });

  await test.step("Гость: подтверждает бронирование первым — успех", async () => {
    const success = guestBookingPage.bookingConfirmSuccess;
    const error = guestBookingPage.bookingConfirmError;

    await expect(success.or(error)).toBeVisible({ timeout: 15_000 });
    if (await error.isVisible().catch(() => false)) {
      throw new Error(`Бронирование не удалось: ${await error.textContent()}`);
    }
  });

  await test.step("Гость2: нажимает на подтверждение бронирования", async () => {
    await guest2BookingPage.bookingConfirmButton.click();
  });

  await test.step("Гость2: пытается забронировать тот же слот вторым — видит ошибку", async () => {
    const success2 = guest2BookingPage.bookingConfirmSuccess;
    const error2 = guest2BookingPage.bookingConfirmError;
    await expect(success2.or(error2)).toBeVisible({ timeout: 15_000 });

    if (await success2.isVisible().catch(() => false)) {
      throw new Error("Слот должен был быть занят, но бронирование прошло успешно");
    }
    await expect(error2).toBeVisible();
  });

  await test.step("Гость: видит бронирование в разделе «Мои встречи»", async () => {
    await expect(async () => {
      await guestBookingPage.gotoBookings();
      const card = guestBookingPage.bookingsCardName;
      await expect(card).toHaveText(host.name);
    }).toPass({ timeout: 10_000 });
  });

  await test.step("Хост: тоже видит это бронирование в своих «Мои встречи»", async () => {
    await expect(async () => {
      await hostBookingPage.gotoBookings();
      const card = hostBookingPage.bookingsCardName;
      await expect(card).toHaveText(guest.name);
    }).toPass({ timeout: 10_000 });
  });

  await hostContext.close();
  await guestContext.close();
  await guest2Context.close();
});
