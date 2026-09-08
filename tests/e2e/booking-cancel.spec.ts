import { test, expect } from "@playwright/test";
import { makeUser, registerUser } from "../helpers/user";
import { ProfilePage } from "../pages/profile-page";
import { BookingPage } from "../pages/booking-page";

test.describe("Флоу отмененной брони", () => {
    test("Гость бронирует встречу и затем отменяет", async ({ browser}) => {

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

        await test.step("Хост: регистрируется в PomidorQA", async () => {
            await registerUser(hostPage, host);
        });

        await test.step("Хост: добавляет навык «могу помочь» в профиле", async () => {
            const skillType = "can_help"

            await hostProfile.goto();
            await hostProfile.addSkill(skillTag, skillType)
        });

        await test.step("Проверяем, что навык появился", async () => {
            await expect(hostProfile.canHelpSkills).toContainText(skillTag);
        });

        await test.step("Хост: добавляет свободный слот на завтра", async () => {

            await hostBooking.gotoSlots();
            await hostBooking.addSlot()
        });

        await test.step("Проверяем, что слот появился", async () => {
            await expect(hostBooking.slotsCard.first()).toBeVisible();
        });

        await test.step("Гость: регистрируется отдельным аккаунтом", async () => {
            await registerUser(guestPage, guest);
        });

        await test.step("Гость: ищет хоста в каталоге по навыку", async () => {

            await guestBooking.fillFilter(skillTag);
        });

        await test.step("Проверяем, что хост найден", async () => {
            await expect(guestBooking.catalogCard.filter({ hasText: host.name })).toBeVisible();
        });

        await test.step("Гость: открывает карточку хоста", async () => {
            await guestBooking.openCard(host.name);
        });

        await test.step("Проверяем, что карточка хоста открылась", async () => {
            await expect(guestBooking.personName).toHaveText(host.name);
        })

        await test.step("Гость: проверяет наличие слотов", async () => {
            await expect(async () => {
                await guestBooking.getChip()
                await expect(guestBooking.bookingCalendarDay).toBeVisible();
            }).toPass({ timeout: 15_000 });
        });

        await test.step("Гость: выбирает дату", async () => {
            await guestBooking.selectFirstDay()
        });

        await test.step("Гость проверяет выбор даты", async () => {
            await expect(guestBooking.bookingCalendarDay.first()).toBeVisible();
        });

        await test.step("Гость выбирает время", async () => {
            await guestBooking.selectFirstTime()
        });

        await test.step("Гость проверяет выбор времени", async () => {
            await expect(guestBooking.bookingCalendarTime.first()).toBeVisible();
        });

        await test.step("Проверяем, что появилась модалка подтверждения бронирования", async () => {
            await expect(guestBooking.bookingConfirmDialog).toBeVisible();
        });

        await test.step("Гость: подтверждает бронирование", async () => {
            await guestBooking.confirmBooking();
        });

        await test.step("Проверяем, что бронирование удалось", async () => {
            const success = guestBooking.bookingConfirmSuccess;
            const error = guestBooking.bookingConfirmError;

            await expect(success.or(error)).toBeVisible({ timeout: 15_000 });
            if (await error.isVisible().catch(() => false)) {
                throw new Error(`Бронирование не удалось: ${await error.textContent()}`);
            }
        });

        await test.step("Гость: видит бронирование в разделе «Мои встречи»", async () => {
            await expect(async () => {
                await guestBooking.gotoBooking();
                const card = guestBooking.bookingsCardName;
                await expect(card).toHaveText(host.name);
            }).toPass({ timeout: 15_000 });
        });

        await test.step("Хост: тоже видит это бронирование в своих «Мои встречи»", async () => {
            let bookingPage = new BookingPage(hostPage);

            await expect(async () => {
                await bookingPage.gotoBooking();
                const card = bookingPage.bookingsCardName;
                await expect(card).toHaveText(guest.name);
            }).toPass({ timeout: 15_000 });
        });

        await test.step("Гость отменяет бронирование", async () => {
            await guestBooking.cancelBooking();
        });

        await test.step("Гость ждет, пока кнопка отмены скроется из «Ближайших»", async () => {
            await expect(guestBooking.bookingCancelButton).toBeHidden();
        })

        await test.step("Гость рефрешит страницу", async () => {
            await guestPage.reload()
        });

        await test.step("Гость: проверяем, появилось ли бронирование среди прошедших и отмененных", async () => {
            await expect(guestBooking.bookingCanceledMeeting).toBeVisible();
        });

        await test.step("Хост: идем в Мои встречи", async () => {
            await hostBooking.gotoBooking()
        });

        await test.step("Хост рефрешит страницу", async () => {
            await hostPage.reload()
        });

        await test.step("Хост: проверяем, появилось ли бронирование среди прошедших и отмененых", async () => {
            await expect(hostBooking.bookingCanceledMeeting).toBeVisible();
        });

        await hostContext.close();
        await guestContext.close();
    });
});

