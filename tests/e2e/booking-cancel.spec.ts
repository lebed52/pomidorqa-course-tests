import {test, expect} from "@playwright/test";
import {makeUser, registerUser} from "../helpers/user";
import {ProfilePage} from "../pages/profile-page";
import {BookingPage} from "../pages/booking-page";

test("Отмена встречи гостем", async ({browser}) => {

    const runId = Date.now();
    const skillTag = `Playwright-demo-${runId}`;
    const host = makeUser("host", runId);
    const guest = makeUser("guest", runId);

    const hostContext = await browser.newContext();
    const guestContext = await browser.newContext();

    const hostPage = await hostContext.newPage();
    const guestPage = await guestContext.newPage();

    const hostProfilePage = new ProfilePage(hostPage);

    const hostBookingPage = new BookingPage(hostPage);
    const guestBookingPage = new BookingPage(guestPage);

    try {

        await test.step("Хост и гость: регистрируются в PomidorQA", async () => {
            await registerUser(hostPage, host);
            await registerUser(guestPage, guest);
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
            await expect(hostBookingPage.slotsCard.first()).toBeVisible();
        });

        await test.step("Гость: ищет хоста в каталоге по навыку (сценарий 9)", async () => {
            await guestBookingPage.searchCatalogBySkill(skillTag);
        });

        await test.step("Гость: нашел хоста в каталоге по навыку (сценарий 9)", async () => {
            await expect(
                guestBookingPage.catalogCard.filter({hasText: host.name})
            ).toBeVisible();
        });

        await test.step("Гость: открывает карточку хоста", async () => {
            await guestBookingPage.openCatalogCardByName(host.name);
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
            }).toPass({timeout: 10_000});
        });

        await test.step("Гость: кликает по дню и времени в календаре слотов", async () => {
            await guestBookingPage.clickFirstFreeSlot();
        });

        await test.step("Гость: видит подтверждающий диалог", async () => {
            await expect(guestBookingPage.bookingConfirmDialog).toBeVisible();
        });


        await test.step("Гость: подтверждает бронирование", async () => {
            await guestBookingPage.bookingConfirmButton.click();
        });

        await test.step("Гость: видит успех при подтверждении бронирования", async () => {
            const success = guestBookingPage.bookingConfirmSuccess;
            const error = guestBookingPage.bookingConfirmError;

            await expect(success.or(error)).toBeVisible({timeout: 15_000});
            if (await error.isVisible().catch(() => false)) {
                throw new Error(`Бронирование не удалось: ${await error.textContent()}`);
            }
        });

        await test.step("Гость: видит бронирование в разделе «Мои встречи»", async () => {
            await expect(async () => {
                await guestBookingPage.gotoBookings();
                const card = guestBookingPage.upcomingBookingCardByName(host.name);
                await expect(card).toBeVisible();
            }).toPass({timeout: 10_000});
        });

        await test.step("Гость: отменяет встречу в разделе «Мои встречи»", async () => {
            await guestBookingPage.cancelBooking(host.name);
        });

        await test.step("Гость:  карточка исчезает из «Ближайших» и появляется в «Прошедшие и отменённые» с пометкой «отменено»", async () => {
                const card = guestBookingPage.upcomingBookingCardByName(host.name);
                await expect(card).toBeHidden()

                const bookingCancelCard = guestBookingPage.pastAndCanceledBookingCardByName(host.name);
                await expect(bookingCancelCard).toBeVisible();
                await expect(bookingCancelCard).toContainText("отменено");
        });

        await test.step("Гость: после перезагрузки отмена на месте", async () => {
            await guestPage.reload();
            const bookingCancelCard = guestBookingPage.pastAndCanceledBookingCardByName(host.name);
            await expect(bookingCancelCard).toBeVisible();
            await expect(bookingCancelCard).toContainText("отменено");
        });

        await test.step("Хост: открывает свои встречи и видит отменённую встречу именно с этим гостем.»", async () => {
                await hostBookingPage.gotoBookings();
                const bookingCancelCard = hostBookingPage.pastAndCanceledBookingCardByName(guest.name);
                await expect(bookingCancelCard).toBeVisible();
                await expect(bookingCancelCard).toContainText("отменено");
        });

    } finally {
        await hostContext.close();
        await guestContext.close();
    }
});
