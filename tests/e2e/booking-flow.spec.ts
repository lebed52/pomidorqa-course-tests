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

  // Три независимых аккаунта = три независимых браузерных контекста
  const hostContext = await browser.newContext();
  const guestContext = await browser.newContext();
  const guest2Context = await browser.newContext();
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
    await test.step('Добавить навык', async () => {
      await hostProfilePage.goto();
      await hostProfilePage.addSkill(skillTag, 'can_help');
  });

    await test.step('Навык «могу помочь» отображается', async () => {
      await expect(hostProfilePage.canHelpSkills).toContainText(skillTag);
    });
  });

  await test.step('Хост: добавляет свободный слот на завтра', async () => {
    await test.step('Добавление слота', async () => {

      const tomorrow = new Date(Date.now() + 24 * 60 * 60 * 1000);
      const date = tomorrow.toISOString().slice(0, 10);

      await hostBookingPage.addSlot(date, '12:00');
    });

    await test.step('Добавленный слот отображается', async () => {
      await expect(hostBookingPage.slotsCard.first()).toBeVisible();
    });
  });

  await test.step("Гость: регистрируется отдельным аккаунтом", async () => {
    await registerUser(guestPage, guest);
  });

  await test.step('Гость: ищет хоста в каталоге по навыку (сценарий 9)', async () => {
    await test.step('Гость ищет навык по его названию', async () => {
      await guestBookingPage.searchBySkill(skillTag);
    });

    await test.step('У навыка указано имя владельца - хост', async () => {
      await expect(
        guestBookingPage.catalogCard.filter({ hasText: host.name })).toBeVisible();
    });
  });

  await test.step('Гость: открывает карточку хоста', async () => {
    await test.step('Гость находит карточку хоста в каталоге', async () => {
      await guestBookingPage.openHostCard(host.name);
    });

    await test.step('В карточке отображается имя хоста', async () => {
      await expect(guestBookingPage.personName).toHaveText(host.name);
    });
  });

  await test.step('Гость: кликает по дню и времени в календаре слотов', async () => {
    await test.step('Дождаться доступного слота', async () => {
      await guestBookingPage.waitForFirstAvailableDay();
    });

    await test.step('Выбрать день и время', async () => {
      await guestBookingPage.selectFirstAvailableSlot();
    });

    await test.step('Диалог подтверждения отображается', async () => {
      await expect(guestBookingPage.bookingConfirmDialog).toBeVisible();
    });

  // Важно для разбора ДЗ 4: модалку guest2 открываем ДО confirm у guest.
  // Пока слот в UI ещё свободен — оба «человек открыл и отошёл».
  await test.step("Гость2: регистрируется и тоже открывает окно бронирования на тот же слот", async () => {
    await test.step("Гость2: регистрируется отдельным аккаунтом", async () => {
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
  });

  await test.step('Гость: подтверждает бронирование первым — успех', async () => {
    await test.step('Гость нажимает кнопку подтверждения бронирования', async () => {
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
  });

  await test.step(
  'Гость2: пытается забронировать тот же слот вторым — видит ошибку',
  async () => {
      await test.step('Гость 2 кликает на кнопку подтверждения бронирования', async () => {
        await guest2BookingPage.bookingConfirmButton.click();
      });

      await test.step('Гостю2 показывается сообщение об ошибке', async () => {
        const success2 = guest2BookingPage.bookingConfirmSuccess;
        const error2 = guest2BookingPage.bookingConfirmError;

        await expect(success2.or(error2)).toBeVisible({ timeout: 15_000 });

        // Ошибка — ожидаемый результат, поскольку слот уже занят гостем 1
        if (await success2.isVisible().catch(() => false)) {
          throw new Error(
            'Слот должен был быть занят, но бронирование прошло успешно',
          );
        }

        await expect(error2).toBeVisible();
      });
    },
  );

  await test.step('Гость: видит бронирование в разделе «Мои встречи»', async () => {
    await test.step('Гость переходит в «Мои встречи»', async () => {
      await guestBookingPage.gotoMeetings();
    });

    await test.step('Бронирование с хостом отображается', async () => {
      await expect(
        guestBookingPage.getMeetingCard(host.name),
      ).toBeVisible({ timeout: 10_000 });
    });
  });

  await test.step('Хост: тоже видит это бронирование в своих «Мои встречи»', async () => {
    await test.step('Хост переходит в «Мои встречи»', async () => {
      await hostBookingPage.gotoMeetings();
    });

    await test.step('Бронирование с гостем отображается', async () => {
      await expect(
        hostBookingPage.getMeetingCard(guest.name),
      ).toBeVisible({ timeout: 10_000 });
      });
    });
  });

    await hostContext.close();
    await guestContext.close();
    await guest2Context.close();
  });
});