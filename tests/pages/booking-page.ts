import { Locator, Page } from "@playwright/test";
import {ROUTES} from "../helpers/user";

export class BookingPage {
    readonly page: Page;

    readonly slotsDateInput: Locator;
    readonly slotsTimeInput: Locator;
    readonly slotsAddSubmit: Locator;
    readonly slotsCard: Locator;

    readonly catalogFilterInput: Locator;
    readonly catalogFilterSubmit: Locator;
    readonly catalogCard: Locator;
    readonly personName: Locator;

    readonly bookingCalendarDay: Locator;
    readonly bookingCalendarTime: Locator;

    readonly bookingConfirmDialog: Locator;
    readonly bookingConfirmButton: Locator;
    readonly bookingConfirmSuccess: Locator;
    readonly bookingConfirmError: Locator;

    readonly bookingsUpcomingSection: Locator;
    readonly bookingsCardName: Locator;
    readonly bookingCancelButton: Locator;
    readonly bookingIrrelevantMeetingsSection: Locator;
    readonly bookingCanceledMeeting: Locator;

    constructor(page: Page) {
        this.page = page;

        this.slotsDateInput = page.locator("#pomidorqa-slots-date");
        this.slotsTimeInput = page.locator("#pomidorqa-slots-time");
        this.slotsAddSubmit = page.getByRole("button", { name: "Добавить слот" });
        this.slotsCard = page.locator("[data-slot-id]");

        this.catalogFilterInput = page.locator("#pomidorqa-catalog-skill-filter");
        this.catalogFilterSubmit = page.getByRole("button", { name: "Найти" });
        this.catalogCard = page.getByTestId("person-card");
        this.personName = page.getByRole("heading", { level: 1 });

        this.bookingCalendarDay = page
            .getByRole("group", { name: "Дни со слотами" })
            .getByRole("button");
        this.bookingCalendarTime = page
            .getByRole("group", { name: "Время слотов" })
            .getByRole("button");

        this.bookingConfirmDialog = page.getByRole("dialog");
        this.bookingConfirmButton = page
            .getByRole("dialog")
            .getByRole("button", { name: "Подтвердить" });
        this.bookingConfirmSuccess = page.getByRole("dialog").getByRole("status");
        this.bookingConfirmError = page.getByRole("dialog").getByRole("alert");
        this.bookingsUpcomingSection = page.getByTestId("upcoming-meetings");
        const upcomingCard = this.bookingsUpcomingSection.locator("[data-booking-id]").first();
        this.bookingsCardName = upcomingCard.locator("p").first();
        this.bookingCancelButton = upcomingCard.getByRole("button", { name: "Отменить" });
        this.bookingIrrelevantMeetingsSection = page
            .locator("section")
            .filter({ has: page.getByRole("heading", { name: "Прошедшие и отменённые" }) });
        this.bookingCanceledMeeting = this.bookingIrrelevantMeetingsSection
            .locator("[data-booking-id]")
            .filter({ hasText: "отменено" })
            .first();
    };

    async gotoSlots() {
        await this.page.goto(ROUTES.slots);
    };

    async gotoBooking() {
        await this.page.goto(ROUTES.bookings);
    };

    async addSlot(
        date: string = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString().slice(0, 10),
        time: string = "12:00"
    ) {
        await this.slotsDateInput.fill(date);
        await this.slotsTimeInput.fill(time);
        await this.slotsAddSubmit.click();
    };

    async fillFilter(tag: string) {
        await this.catalogFilterInput.fill(tag);
        await this.catalogFilterSubmit.click();
    };

    async openCard(hostName: string) {
        await this.catalogCard.filter({ hasText: hostName }).click()
    };

    async getChip() {
        const dayChip = this.bookingCalendarDay.first();
        if (!(await dayChip.isVisible().catch(() => false))) {
            await this.page.reload();
        }
    };

    async selectFirstDay() {
        await this.bookingCalendarDay.first().click();
    };

    async selectFirstTime() {
        const timeChip = this.bookingCalendarTime.first();
        await timeChip.click();

        if (!(await this.bookingConfirmDialog.isVisible().catch(() => false))) {
            await timeChip.click().catch(() => {});
        }
    }

    async confirmBooking() {
        await this.bookingConfirmButton.click();

    };

    async cancelBooking() {
        await this.gotoBooking();
        await this.bookingCancelButton.click();
        await this.bookingCancelButton.waitFor({ state: "hidden", timeout: 5000 }).catch(() => {});
    }
}
