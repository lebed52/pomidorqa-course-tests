import { test, expect } from '@playwright/test';    
import { BookingPage } from "./pages/booking-page";
import { makeUser, registerUser } from './helpers/registerUser';
import { ProfilePage } from "./pages/profile-page";


test.describe("Бронирование и отмена встречи", () => {
  
    test("Отмена бронирования слота: карточка переходит в прошедшие, отмену видят хост и гость", async ({ browser }) => {  
    
      const runId = Date.now();
      const skillTag = `Playwright-demo-${runId}`;
      const host = makeUser("host", runId);
      const guest = makeUser("guest", runId);

      const hostContext = await browser.newContext();
      const guestContext = await browser.newContext();
  
      const hostPage = await hostContext.newPage();
      const guestPage = await guestContext.newPage();

      const hostProfile = new ProfilePage(hostPage);
      const hostBooking = new BookingPage(hostPage);
      const guestBooking = new BookingPage(guestPage);

      await test.step("Хост регистрируется", async () => {
      await registerUser(hostPage, host);
    })
 
      await test.step("Хост добавляет навык 'могу помочь' в профиле", async () => {
        await hostProfile.open()
        await hostProfile.addSkill(skillTag,"can_help");
    })
      await test.step("Хост проверяет, что навык добавлен", async () => {
        await expect(hostProfile.canHelpSkills).toContainText(skillTag);
      })

      await test.step("Хост: добавляет свободный слот на завтра", async () => {
        await hostBooking.openSlots();
        const tomorrow = new Date(Date.now() + 24 * 60 * 60 * 1000);
        const date = tomorrow.toISOString().slice(0, 10);
        await hostBooking.addSlot(date, "12:00");
      }) 
      
      await test.step("Хост: проверяет, что слот добавлен", async () => {
        await expect(hostBooking.slotsCard.first()).toBeVisible();
        })

      await test.step("Гость регистрируется", async () => {
        await registerUser(guestPage, guest);
      })

      await test.step("Гость: ищет хоста в каталоге по навыку", async () => {
        await guestBooking.searchBySkill(skillTag);
      })
      
      await test.step("Гость: проверяет наличие карточки хоста", async () => {
        await expect(guestBooking.catalogCard.filter({ hasText: host.name })).toBeVisible();
      })

      await test.step("Гость: открывает карточку хоста", async () => {
        await guestBooking.catalogCard.filter({ hasText: host.name }).click();
      })
      
      await test.step("Гость: проверяет, что открылась карточка хоста", async () => {
        await expect(guestBooking.personName).toHaveText(host.name);
      })
      await test.step("Гость: дожидается появления слотов в календаре", async () => {
        await expect(async () => {
        const dayChip = guestBooking.bookingCalendarDay.first();
        if (!(await dayChip.isVisible().catch(() => false))) {
          await guestPage.reload();
      }
      await expect(dayChip).toBeVisible();
    }).toPass({ timeout: 10_000 });

});
    await test.step("Гость: кликает по дню и времени в календаре слотов", async () => {
    await guestBooking.bookingCalendarDay.first().click();
    await guestBooking.bookingCalendarTime.first().click();
    });
    
    await test.step("Гость: проверяет появление модального окна подтверждения бронирования", async () => {
     await expect(guestBooking.bookingConfirmDialog).toBeVisible();   
    });

    await test.step("Гость: подтверждает брнирование", async () => {
    await guestBooking.bookingConfirmButton.click();
    });
    
    await test.step("Гость: проверяет, что бронирование прошло успешно", async () => {
        await expect(guestBooking.bookingConfirmSuccess).toBeVisible({ timeout: 15_000});
    });

    await test.step("Гость: переходит в раздел «Мои встречи»", async () => {
        await guestBooking.openBooking();
    });

    await test.step("Гость: видит бронирование", async () => {
        const card = guestBooking.bookingsCardName.first();
        await expect(card).toHaveText(host.name, { timeout: 10_000 });
    });
    
    await test.step("Гость: кликает по кнопке отмены", async () => {
        const card = guestBooking.bookingsCardName.first();
        await guestBooking.bookingCancelButton.click();
        await card.waitFor({ state: "hidden", timeout: 10_000 });
    });
    await test.step("Гость: проверяет, что карточка появляется в «Прошедшие и отменённые»", async () => {
        const bookingCancelCard = guestBooking.bookingCancelCardByName(host.name);
        await expect(bookingCancelCard).toBeVisible();
        await expect(bookingCancelCard).toContainText("отменено");
    });
     
    await test.step("Гость: перезагружает страницы", async () => {
        await guestPage.reload();
  });
    await test.step("Гость: после перезагрузки отмена отображается", async () => {
        const bookingCancelCard = guestBooking.bookingCancelCardByName(host.name);
        await expect(bookingCancelCard).toBeVisible();
        await expect(bookingCancelCard).toContainText("отменено");
    });

    await test.step("Хост: переходит в раздел «Мои встречи»", async () => {
        await hostBooking.openBooking();
    });

    await test.step("Хост: видит отмененную встречу с Гостем", async () => {
        const bookingCancelCard = hostBooking.bookingCancelCardByName(guest.name);
        await expect(bookingCancelCard).toBeVisible();
        await expect(bookingCancelCard).toContainText("отменено");
    });
    
    await hostContext.close();
    await guestContext.close();
         
    })

 })

