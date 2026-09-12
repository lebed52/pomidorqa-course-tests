import { test, expect } from "@playwright/test";
import { makeUser, registerUser } from "../helpers/user";
import { ProfilePage } from "../pages/ProfilePage";
import { BookingPage } from "../pages/BookingPage";


test.describe('Гость бронирует встречу, отменяет её, карточка переходит в прошедшие. После reload отмену видят и гость, и хост.', () => {
  test ('Полный сценарий бронирования и отмены', async ({ browser }) => {
  const runId = Date.now();
  const skillTag = `Playwright-demo-${runId}`;
  const host = makeUser("host", runId);
  const guest = makeUser("guest", runId);

  // Два независимых аккаунта = два независимых браузерных контекста
  const hostContext = await browser.newContext();
  const guestContext = await browser.newContext();
  
  const hostPage = await hostContext.newPage();
  const guestPage = await guestContext.newPage();
  
  const hostProfile = new ProfilePage(hostPage);
  const hostBooking = new BookingPage(hostPage); 
  const guestBooking = new BookingPage(guestPage);

  try{

  await test.step("Хост: регистрируется в PomidorQA", async () => {
    await registerUser(hostPage, host);
  });
 
  await test.step('Хост: добавляет навык «могу помочь» в профиле', async () => {
    await hostProfile.goto();
    await hostProfile.addSkill(skillTag, "can_help")
  });

  await test.step('Хост: проверяет наличие навыка «могу помочь» в профиле', async () => {
    await expect(hostProfile.canHelpSkills).toContainText(skillTag);
  });

  await test.step("Хост: добавляет свободный слот на завтра", async () => {
    await hostBooking.gotoSlots()
    await hostBooking.addSlot()
    });

    await test.step("Хост: проверяет наличие свободного слота на завтра", async () => {
    await expect(hostBooking.slotsCard.first()).toBeVisible();
  });

  await test.step("Гость: регистрируется отдельным аккаунтом", async () => {
    await registerUser(guestPage, guest);
  });

  await test.step("Гость: ищет хоста в каталоге по навыку", async () => {
    await guestBooking.searchBySkill(skillTag)
   });

  await test.step("Гость: проверяет карточку хоста в каталоге", async () => {
    await expect(guestBooking.catalogCard.filter({ hasText: host.name })
    ).toBeVisible();
  });

  await test.step("Гость: открывает карточку хоста", async () => {
    await guestBooking.openCard(host.name)
  });

  await test.step("Гость: проверяет наличие имени хоста в карточке хоста", async () => {
  await expect(guestBooking.personName).toHaveText(host.name);
  });

  await test.step("Гость: кликает по дню и времени в календаре слотов", async () => {
    await guestBooking.selectSlot();
    });

    await test.step("Гость: проверяет наличие диалога подтверждения бронирования", async () => {
    await expect(guestBooking.bookingConfirmDialog).toBeVisible();
  });

  await test.step("Гость: подтверждает бронирование - успех", async () => {
    await guestBooking.bookingConfirm()
  });

  await test.step("Гость: переходит к бронированию в разделе «Мои встречи»", async () => {
    await guestBooking.gotoBookings();
  });

  await test.step("Гость: видит бронирование в разделе «Мои встречи»", async () => {
    await expect(async () => {
      const card = guestBooking.bookingsCardName;
      await expect(card).toHaveText(host.name);
    }).toPass({ timeout: 10_000 });
  });
  
      await test.step("Гость: отменяет встречу", async () => {
      await guestBooking.cancelBooking();
    });

    await test.step("Гость: проверяет, что встреча перешла в прошедшие", async () => {
      await expect(guestBooking.bookingCancelCard(host.name)).toBeVisible();
    });

    await test.step("Гость: обновляет страницу", async () => {
      await guestPage.reload();
    });

    await test.step(
      "Гость: После reload отмена видна",
      async () => {
        await expect(guestBooking.bookingCancelCard(host.name)).toBeVisible();
      },
    );

    await test.step("Хост: открывает раздел «Мои встречи»", async () => {
      await hostBooking.gotoBookings();
      await hostPage.reload()
    });

    await test.step(
      "Хост: После reload отмена видна",
      async () => {
        await expect(hostBooking.bookingCancelCard(guest.name)).toBeVisible();
      },
    );
  } finally {
  await hostContext.close();
  await guestContext.close();
  }
});
});