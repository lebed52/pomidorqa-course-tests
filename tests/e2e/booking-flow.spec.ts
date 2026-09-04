import { test, expect, type Page } from "@playwright/test";
import { makeUser, registerUser, ROUTES } from "../helpers/user";
import { BookingPage } from "../pages/booking-page";
import { ProfilePage } from "../pages/profile-page";

  test.beforeEach(async ({ browser }) => {
    const hostContext = await browser.newContext();
    const guestContext = await browser.newContext();
    const guest2Context = await browser.newContext();

    /*
    hostPage = await hostContext.newPage();
    guestPage = await guestContext.newPage();
    guest2Page = await guest2Context.newPage();
    */
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
      await hostProfilePage.skillInput.fill(skillTag);
      await hostProfilePage.skillTypeSelect.selectOption('can_help');
      await hostProfilePage.addSkillButton.click();
  });

    await test.step('Навык «могу помочь» отображается', async () => {
      await expect(hostProfilePage.canHelpSkills).toContainText(skillTag);
    });
  });

  await test.step('Хост: добавляет свободный слот на завтра', async () => {
    await test.step('Добавление навыка', async () => {
      await hostPage.goto(ROUTES.slots);

      const tomorrow = new Date(Date.now() + 24 * 60 * 60 * 1000);
      const date = tomorrow.toISOString().slice(0, 10);

      await hostBookingPage.slotsDateInput.fill(date);
      await hostBookingPage.slotsTimeInput.fill('12:00');
      await hostBookingPage.slotsAddSubmit.click();
    });

    await test.step('Добавленный навык отображается', async () => {
      await expect(hostBookingPage.slotsCard.first()).toBeVisible();
    });
  });

  await test.step("Гость: регистрируется отдельным аккаунтом", async () => {
    await registerUser(guestPage, guest);
  });

  await test.step('Гость: ищет хоста в каталоге по навыку (сценарий 9)', async () => {
    await test.step('Гость ищет навык по его названию', async () => {
      await guestBookingPage.catalogFilterInput.fill(skillTag);
      await guestBookingPage.catalogFilterSubmit.click();
    });

    await test.step('У навыка указано имя владельца - хост', async () => {
      await expect(
        guestBookingPage.catalogCard.filter({ hasText: host.name })
      ).toBeVisible();
    });
  });

  await test.step('Гость: открывает карточку хоста', async () => {
    await test.step('Гость находит карточку хоста в каталоге', async () => {
      await guestBookingPage.catalogCard
        .filter({ hasText: host.name })
        .click();
    });

    await test.step('В карточке отображается имя хоста', async () => {
      await expect(guestBookingPage.personName).toHaveText(host.name);
    });
  });

  await test.step('Гость: кликает по дню и времени в календаре слотов', async () => {
    await test.step('Гость видит дату и время в календаре слотов', async () => {
      await expect(async () => {
        const dayChip = guestBookingPage.bookingCalendarDay.first();

        if (!(await dayChip.isVisible().catch(() => false))) {
          await guestPage.reload();
        }

        await expect(dayChip).toBeVisible();
      }).toPass({ timeout: 10_000 });
    });
      await test.step('Гость кликает по дню и времени в календаре слотов', async () => {
        await guestBookingPage.bookingCalendarDay.first().click();
        await guestBookingPage.bookingCalendarTime.first().click();
      });

      await test.step('Гость видит диалог подтверждения', async () => {
        await expect(guestBookingPage.bookingConfirmDialog).toBeVisible();
      });
    });

  // Важно для разбора ДЗ 4: модалку guest2 открываем ДО confirm у guest.
  // Пока слот в UI ещё свободен — оба «человек открыл и отошёл».
  await test.step("Гость2: регистрируется и тоже открывает окно бронирования на тот же слот", async () => {
    await test.step("Гость2: регистрируется отдельным аккаунтом", async () => {
      await registerUser(guest2Page, guest2);
    });

    await test.step("Гость2 находит хоста в каталоге по навыку", async () => {
      await guest2BookingPage.catalogFilterInput.fill(skillTag);
      await guest2BookingPage.catalogFilterSubmit.click();
      await guest2BookingPage.catalogCard.filter({ hasText: host.name }).click();
      await expect(guest2BookingPage.personName).toHaveText(host.name);
    });

    await test.step("гость2 находит время и дату в календаре слотов", async () => {
      await expect(async () => {
        const dayChip = guest2BookingPage.bookingCalendarDay.first();
        if (!(await dayChip.isVisible().catch(() => false))) {
          await guest2Page.reload();
        }
        await expect(dayChip).toBeVisible();
      }).toPass({ timeout: 10_000 });
    });

    await test.step('Гость2 кликает по дню и времени в календаре слотов', async () => {
        await guest2BookingPage.bookingCalendarDay.first().click();
        await guest2BookingPage.bookingCalendarTime.first().click();
      });

    await test.step('Гость2 видит диалог подтверждения', async () => {
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
    await test.step('Гость переходит на страницу "Мои встречи"', async () => {
      await guestPage.goto(ROUTES.booking);
    });

    await test.step('На странице отображается забронированный слот', async () => {
      await expect(guestBookingPage.bookingsCardName).toHaveText(host.name, {
        timeout: 10_000,
      });
    });
  });

  await test.step('Хост: тоже видит это бронирование в своих «Мои встречи»', async () => {
    await test.step('Хост переходит на страницу "Мои встречи"', async () => {
      await hostPage.goto(ROUTES.booking);
    });

    await test.step('Хост видит бронирование гостя', async () => {
      await expect(hostBookingPage.bookingsCardName).toHaveText(guest.name, {
        timeout: 10_000,
      });
    });
  });

  await hostContext.close();
  await guestContext.close();
  await guest2Context.close();
});
  });