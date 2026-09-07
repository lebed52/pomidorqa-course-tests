import { test, expect } from "@playwright/test";
import { makeUser, registerUser } from "../helpers/user";
import { ProfilePage } from "../pages/profile-page";
import { createHostAndGuestsContexts, closeHostGuestContexts } from "../helpers/booking";

test.describe("Бронирование и отмена встречи", () => {
    test("гость бронирует и отменяет встречу", async ({ browser }) => {
        const runId = Date.now();
        const skillTag = `Playwright-cancel-${runId}`;
        const host = makeUser("host", runId);
        const guest = makeUser("guest", runId);

        const { hostCtx, guestCtx, guest2Ctx } = await createHostAndGuestsContexts(browser);

        const { page: hostPage, bookingPage: hostBookingPage } = hostCtx;
        const { page: guestPage, bookingPage: guestBookingPage } = guestCtx;

        const hostProfilePage = new ProfilePage(hostPage);

        try {
            await test.step("Хост: регистрируется в PomidorQA", async () => {
                await registerUser(hostPage, host);
            });

            await test.step("Хост: открывает профиль", async () => {
                await hostPage.goto("/pomidorqa/profile");
            });

            await test.step("Хост: добавляет навык", async () => {
                await hostProfilePage.addSkill(skillTag, "can_help");
            });

            await test.step("Хост: видит добавленный навык", async () => {
                await expect(hostProfilePage.profileCanHelpSkills).toContainText(skillTag);
            });

            await test.step("Хост: открывает страницу слотов", async () => {
                await hostPage.goto("/pomidorqa/profile/slots");
            });

            await test.step("Хост: добавляет свободный слот на завтра", async () => {
                const tomorrow = new Date(Date.now() + 24 * 60 * 60 * 1000);
                const date = tomorrow.toISOString().slice(0, 10);
                await hostBookingPage.bookingSlotsDateInput.fill(date);
                await hostBookingPage.bookingSlotsTimeInput.fill("12:00");
                await hostBookingPage.bookingSlotsAddSubmit.click();
            });

            await test.step("Хост: видит добавленный слот", async () => {
                await expect(hostBookingPage.bookingSlotsCard.first()).toBeVisible();
            });

            await test.step("Гость: регистрируется", async () => {
                await registerUser(guestPage, guest);
            });

            await test.step("Гость: ищет хоста в каталоге", async () => {
                await guestBookingPage.searchHost(skillTag);
            });

            await test.step("Гость: видит хоста в результатах поиска", async () => {
                await expect(guestBookingPage.bookingCatalogCard.filter({ hasText: host.name })).toBeVisible();
            });

            await test.step("Гость: открывает карточку хоста", async () => {
                await guestBookingPage.openHost(host.name);
            });

            await test.step("Гость: видит страницу хоста", async () => {
                await expect(guestBookingPage.bookingPersonName).toHaveText(host.name);
            });

            await test.step("Гость: дожидается доступного дня в календаре", async () => {
                await expect(async () => {
                    const dayChip = guestBookingPage.bookingCalendarDay.first();

                    if (!(await dayChip.isVisible().catch(() => false))) {
                        await guestPage.reload();
                    }

                    await expect(dayChip).toBeVisible();}).toPass({ timeout: 10_000 });
            });

            await test.step("Гость: бронирует первый доступный слот", async () => {
                await guestBookingPage.bookFirstAvailableSlot();
            });

            await test.step("Гость: видит результат бронирования", async () => {
                const success = guestBookingPage.bookingConfirmSuccess;
                const error = guestBookingPage.bookingConfirmError;

                await expect(success.or(error)).toBeVisible({ timeout: 15_000 });

                if (await error.isVisible().catch(() => false)) {
                    throw new Error(`Бронирование не удалось: ${await error.textContent()}`);}
            });

            await test.step("Гость: открывает свои встречи", async () => {
                await guestPage.goto("/pomidorqa/bookings");
            });

            await test.step("Гость: видит забронированную встречу", async () => {
                await expect(guestBookingPage.bookingCardName).toHaveText(host.name);
            });

            await test.step("Гость: отменяет встречу", async () => {
                await guestBookingPage.cancelBooking();
            });

            await test.step("Гость: видит встречу в разделе прошедших и отменённых", async () => {
                await expect(guestBookingPage.bookingPastSection).toContainText("отменено");
            });

            await test.step("Гость: перезагружает страницу", async () => {
                await guestPage.reload();
            });

            await test.step("Гость: после перезагрузки видит отменённую встречу", async () => {
                await expect(guestBookingPage.bookingPastSection).toContainText("отменено");
            });

            await test.step("Хост: открывает свои встречи", async () => {
                await hostPage.goto("/pomidorqa/bookings");
            });

            await test.step("Хост: видит отменённую встречу", async () => {
                await expect(hostBookingPage.bookingPastSection).toContainText("отменено");
            });

            await test.step("Хост: перезагружает страницу", async () => {
                await hostPage.reload();
            });

            await test.step("Хост: после перезагрузки видит отменённую встречу", async () => {
                await expect(hostBookingPage.bookingPastSection).toContainText("отменено");
            });
        } finally {
            await closeHostGuestContexts({ hostCtx, guestCtx, guest2Ctx });
        }
    });
});
