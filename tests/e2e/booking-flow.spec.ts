import { test, expect, type Page, Browser } from "@playwright/test";
import { makeUser, registerUser, ROUTES } from "../helpers/user";
import { BookingPage } from "../pages/booking-page";
import { ProfilePage } from "../pages/profile-page";

test.describe("Бронирование встречи>", () => {
  
  test("основной путь + гонка за слот: регистрация → навык → слот → поиск в каталоге → бронирование → «Мои встречи» у обоих → второй гость видит ошибку", async ({

  browser,
}) => {
  const runId = Date.now();
  const skillTag = `Playwright-demo-${runId}`;
  const host = makeUser("host", runId);
  const guest = makeUser("guest", runId);
  const guest2 = makeUser("guest2", runId);

  // фиксируем таймзону, чтобы тест не флакал. Вообще это надо чинить на уровне приложения; так что предположим, отнесли это разработчику
  const contextOptions = {
    timezoneId: 'UTC',
  };

  // Три независимых аккаунта = три независимых браузерных контекста
  const hostContext = await browser.newContext(contextOptions);
  const guestContext = await browser.newContext(contextOptions);
  const guest2Context = await browser.newContext(contextOptions);
  const hostPage = await hostContext.newPage();
  const guestPage = await guestContext.newPage();
  const guest2Page = await guest2Context.newPage();

  // экземпляры страниц
  const hostProfilePage = new ProfilePage(hostPage);

  const hostBookingPage = new BookingPage(hostPage);
  const guestBookingPage = new BookingPage(guestPage);
  const guest2BookingPage = new BookingPage(guest2Page);

  await test.step("Хост: регистрируется в PomidorQA", async () => {
    await registerUser(hostPage, host);
  });
 
  await test.step('Хост: добавляет навык «могу помочь» в профиле', async () => {
    await hostProfilePage.goto();
    await hostProfilePage.addSkill(skillTag, 'can_help');
  });

  await test.step('Навык «могу помочь» отображается', async () => {
    await expect(hostProfilePage.canHelpSkills).toContainText(skillTag);
  });

  await test.step('Хост: добавляет свободный слот на завтра', async () => {

    const tomorrow = new Date(Date.now() + 24 * 60 * 60 * 1000);
    const date = tomorrow.toISOString().slice(0, 10);

    await hostBookingPage.addSlot(date, '12:00');
  });

    await test.step('Добавленный слот отображается', async () => {
      await expect(hostBookingPage.slotsCard.first()).toBeVisible();
    });

  await test.step("Гость: регистрируется отдельным аккаунтом", async () => {
    await registerUser(guestPage, guest);
  });

  await test.step('Гость: ищет хоста в каталоге по навыку (сценарий 9)', async () => {
      await guestBookingPage.searchBySkill(skillTag);
    });

    await test.step('У навыка указано имя владельца - хост', async () => {
      await expect(
        guestBookingPage.catalogCard.filter({ hasText: host.name })).toBeVisible();
    });

  await test.step('Гость: открывает карточку хоста в каталоге', async () => {
    await guestBookingPage.openHostCard(host.name);
  });

  await test.step('В карточке отображается имя хоста', async () => {
    await expect(guestBookingPage.personName).toHaveText(host.name);
  });

  await test.step('Гость: кликает по дню и времени в календаре слотов', async () => {
      await guestBookingPage.waitForFirstAvailableDay();
      await guestBookingPage.selectFirstAvailableSlot();
    });

    await test.step('Диалог подтверждения отображается', async () => {
      await expect(guestBookingPage.bookingConfirmDialog).toBeVisible();
    });

  // Важно для разбора ДЗ 4: модалку guest2 открываем ДО confirm у guest.
  // Пока слот в UI ещё свободен — оба «человек открыл и отошёл».
  await test.step("Гость2: регистрируется и тоже открывает окно бронирования на тот же слот", async () => {
      await registerUser(guest2Page, guest2);
    });

    await test.step("Гость2 находит хоста в каталоге по навыку", async () => {
      await guest2BookingPage.searchBySkill(skillTag);
      await expect(guest2BookingPage.catalogCard.filter({ hasText: host.name })).toBeVisible();
      await guest2BookingPage.openHostCard(host.name);
      await expect(guest2BookingPage.personName).toHaveText(host.name);
    });

    await test.step('гость2 дожидается доступного слота', async () => {
      await guest2BookingPage.waitForFirstAvailableDay();
    });

    await test.step('Гость2 выбирает день и время', async () => {
      await guest2BookingPage.selectFirstAvailableSlot();
    });

    await test.step('Диалог подтверждения гостю2 отображается', async () => {
      await expect(guest2BookingPage.bookingConfirmDialog).toBeVisible();
    });

  await test.step('Гость: подтверждает бронирование первым — успех', async () => {
      await guestBookingPage.bookingConfirmButton.click();
    });

    await test.step('Бронирование успешно', async () => {
      const success = guestBookingPage.bookingConfirmSuccess;
      const error = guestBookingPage.bookingConfirmError;

      await expect(success.or(error)).toBeVisible({ timeout: 15_000 });

      if (await error.isVisible().catch(() => false)) {
        throw new Error(`Бронирование не удалось: ${await error.textContent()}`);
      }
    });

  await test.step('Гость2: подтверждает бронирование вторым', async () => {
    await guest2BookingPage.bookingConfirmButton.click();
  });

  await test.step('Гость2: видит ошибку занятого слота', async () => {
    const success = guest2BookingPage.bookingConfirmSuccess;
    const error = guest2BookingPage.bookingConfirmError;

    await expect(success.or(error)).toBeVisible({ timeout: 15_000 });

    if (await success.isVisible().catch(() => false)) {
      throw new Error(
        'Слот должен был быть занят, но бронирование прошло успешно',
      );
    }

    await expect(error).toBeVisible();
  });

  await test.step('Гость: видит бронирование в разделе «Мои встречи»', async () => {
      await guestBookingPage.gotoMeetings();
    });

    await test.step('Бронирование с хостом отображается', async () => {
      await expect(
        guestBookingPage.getMeetingCard(host.name),
      ).toBeVisible({ timeout: 10_000 });
    });

  await test.step('Хост: тоже видит это бронирование в своих «Мои встречи»', async () => {
      await hostBookingPage.gotoMeetings();
    });

    await test.step('Бронирование с гостем отображается', async () => {
      await expect(
        hostBookingPage.getMeetingCard(guest.name),
      ).toBeVisible({ timeout: 10_000 });
    });

    await hostContext.close();
    await guestContext.close();
    await guest2Context.close();
  });
});

test.describe("Бронирование: выбор слота", () => {
  test("при выборе второго времени бронируется именно оно, остальные слоты остаются свободными", async ({
    browser,
    baseURL,
  }) => {
    test.setTimeout(60_000);

    const runId = Date.now();
    const host = makeUser(`selected-slot-host-${runId}`, runId);
    const guest = makeUser(`selected-slot-guest-${runId}`, runId);
    const skillTag = `Selected-slot-${runId}`;
    const date = new Date(Date.now() + 2 * 24 * 60 * 60 * 1000)
      .toISOString().slice(0, 10);
    const times = ["10:00", "12:00", "14:00"];
    const selectedTime = "12:00";
    const remainingTimes = ["10:00", "14:00"];
    const contexts = [];

     // фиксируем таймзону, чтобы тест не флакал. Вообще это надо чинить на уровне приложения; так что предположим, отнесли это разработчику
    const contextOptions = {
      timezoneId: 'UTC',
    };

    try {
      const hostContext = await browser.newContext(contextOptions);
      contexts.push(hostContext);
      const guestContext = await browser.newContext(contextOptions);
      contexts.push(guestContext);
      const hostPage = await hostContext.newPage();
      const guestPage = await guestContext.newPage();

      const hostProfilePage = new ProfilePage(hostPage);
      const hostBookingPage = new BookingPage(hostPage);
      const guestBookingPage = new BookingPage(guestPage);

      await test.step("Открываем регистрацию и создаём хоста и гостя", async () => {
        await registerUser(hostPage, host);
        await registerUser(guestPage, guest);
      });
      await test.step("Хост: добавляет уникальный навык для поиска в каталоге", async () => {
        await hostProfilePage.goto();
        await hostProfilePage.addSkill(skillTag, 'can_help');
      });

      await test.step("Навык хоста сохранён", async () => {
        await expect(hostProfilePage.canHelpSkills).toContainText(skillTag);
      });

      for (const [index, time] of times.entries()) {
        await test.step(`Хост: добавляет слот на ${date} в ${time}`, async () => {
          await hostBookingPage.addSlot(date, time);
        });

        await test.step(`Слот в ${time} появился в списке`, async () => {
          await expect(hostBookingPage.slotsCard).toHaveCount(index + 1);
        });
      }

      await test.step("Гость: находит и открывает карточку хоста", async () => {
        await guestPage.goto(ROUTES.home);
        await guestBookingPage.searchBySkill(skillTag);
        await guestBookingPage.openHostCard(host.name);
      });

      await test.step("Открыта карточка хоста с одним днём для бронирования", async () => {
        await expect(guestBookingPage.personName).toHaveText(host.name);
        await expect(guestBookingPage.bookingCalendarDay).toHaveCount(1);
      });

      const personUrl = guestPage.url();

      await test.step("Гость: выбирает день со слотами", async () => {
        await guestBookingPage.bookingCalendarDay.click();
      });

      await test.step("Доступны три времени, выбранное время стоит вторым", async () => {
        // Проверяем порядок до клика: тест не должен случайно выбрать первый слот.
        await expect(guestBookingPage.bookingCalendarTime).toHaveText(times);
      });

      await test.step("Гость: выбирает второе время — 12:00", async () => {
        await guestBookingPage.selectNthAvailableSlot(1);
      });

      await test.step("В подтверждении указано выбранное время", async () => {
        await expect(guestBookingPage.bookingConfirmDialog).toBeVisible();
        await expect(guestBookingPage.bookingConfirmDialog).toContainText(selectedTime);
      });

      await test.step("Гость: подтверждает выбранный слот", async () => {
        await guestBookingPage.bookingConfirmButton.click();
      });

      await test.step("Бронирование завершилось успешно", async () => {
        await expect(guestBookingPage.bookingConfirmSuccess).toBeVisible({ timeout: 15_000 });
        await expect(guestBookingPage.bookingConfirmError).not.toBeVisible();
      });

      for (const { bookingPage, role, partner } of [
        { bookingPage: guestBookingPage, role: "Гость", partner: host.name },
        { bookingPage: hostBookingPage, role: "Хост", partner: guest.name },
      ]) {
        await test.step(`${role}: открывает «Мои встречи» с сервера`, async () => {
          await bookingPage.gotoMeetings();
        });

        await test.step(`${role}: создана ровно одна встреча на выбранное время`, async () => {
          const meetings = bookingPage.bookingsUpcomingSection.locator("[data-booking-id]");
          await expect(meetings).toHaveCount(1);
          await expect(meetings).toContainText(partner);
          await expect(meetings).toContainText(selectedTime);
          for (const time of remainingTimes) {
            await expect(meetings).not.toContainText(time);
          }
        });
      }

      await test.step("Гость: заново открывает календарь хоста", async () => {
        await guestPage.goto(personUrl);
        await guestBookingPage.bookingCalendarDay.click();
      });

      await test.step("Первый и третий слоты свободны, выбранный больше недоступен", async () => {
        await expect(guestBookingPage.bookingCalendarTime).toHaveText(remainingTimes);
      });
    } finally {
      await Promise.all(contexts.map((context) => context.close()));
    }
  });
});
