import { expect, test } from "@playwright/test";
import { makeUser, registerUser } from "../helpers/user";
import { BookingPage } from "../pages/booking-page";
import { ProfilePage } from "../pages/profile-page";

test.describe("Каталог: поиск собеседника", () => {
    test("участник с будущим свободным слотом находится по навыку", async ({
        browser,
    }) => {
        test.setTimeout(60_000);

        const runId = Date.now();
        const skillTag = `Playwright-search-${runId}`;
        const host = makeUser("search-host", runId);
        const guest = makeUser("search-guest", runId);

        const hostContext = await browser.newContext();
        const guestContext = await browser.newContext();

        try {
            const hostPage = await hostContext.newPage();
            const guestPage = await guestContext.newPage();

            const hostBookingPage = new BookingPage(hostPage);
            const guestBookingPage = new BookingPage(guestPage);
            const hostProfilePage = new ProfilePage(hostPage);

            await test.step("Хост: регистрируется", async () => {
                await registerUser(hostPage, host);
            });

            await test.step("Хост: добавляет уникальный навык", async () => {
                await hostProfilePage.open();
                await hostProfilePage.addCanHelpSkill(skillTag);
            });

            await test.step("Хост: добавляет свободный слот на завтра", async () => {
                await hostBookingPage.goToSlots();

                const tomorrow = new Date(Date.now() + 24 * 60 * 60 * 1000);
                const date = tomorrow.toISOString().slice(0, 10);

                await hostBookingPage.addSlot(date, "12:00");
            });

            await test.step("Слот создан", async () => {
                await expect(hostBookingPage.slotCard("12:00")).toBeVisible({
                    timeout: 10_000,
                });
            });

            await test.step("Гость: регистрируется", async () => {
                await registerUser(guestPage, guest);
            });

            await test.step("Гость: ищет хоста по уникальному навыку", async () => {
                await guestBookingPage.findPersonBySkill(skillTag);
            });

            await test.step("Проверяем, что найдена карточка хоста", async () => {
                await expect(guestBookingPage.personCard(host.name)).toBeVisible({
                    timeout: 10_000,
                });
            });
        } finally {
            await guestContext.close();
            await hostContext.close();
        }
    });

    test("при неизвестном навыке отображается пустая выдача", async ({
        browser,
    }) => {
        test.setTimeout(60_000);

        const runId = Date.now();
        const user = makeUser("empty-search", runId);
        const unknownSkill = `No-such-skill-${runId}`;

        const context = await browser.newContext();

        try {
            const page = await context.newPage();
            const bookingPage = new BookingPage(page);

            await test.step("Пользователь: регистрируется", async () => {
                await registerUser(page, user);
            });

            await test.step("Пользователь: ищет несуществующий навык", async () => {
                await bookingPage.findPersonBySkill(unknownSkill);
            });

            await test.step("Проверяем сообщение пустой выдачи", async () => {
                await expect(bookingPage.catalogEmptyState).toBeVisible();
                await expect(bookingPage.catalogCards).toHaveCount(0);
            });
        } finally {
            await context.close();
        }
    });
});