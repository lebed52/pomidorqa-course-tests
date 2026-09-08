import { type Locator, type Page } from "@playwright/test";

const ROUTES = {
    profile: "/pomidorqa/profile",
    slots: "/pomidorqa/profile/slots",
    bookings: "/pomidorqa/bookings",
};

export class BookingPage {
    readonly page: Page;

    readonly profileSkillInput: Locator;
    readonly profileSkillTypeSelect: Locator;
    readonly profileSkillSubmit: Locator;
    readonly profileCanHelpSkills: Locator;

    readonly slotsDateInput: Locator;
    readonly slotsTimeInput: Locator;
    readonly slotsAddSubmit: Locator;
    readonly slotsCards: Locator;

    readonly catalogFilterInput: Locator;
    readonly catalogFilterSubmit: Locator;
    readonly catalogCards: Locator;

    readonly personName: Locator;

    readonly bookingCalendarDays: Locator;
    readonly bookingCalendarTimes: Locator;

    readonly bookingConfirmDialog: Locator;
    readonly bookingConfirmButton: Locator;
    readonly bookingConfirmSuccess: Locator;
    readonly bookingConfirmError: Locator;

    readonly bookingsUpcomingSection: Locator;
    readonly bookingsCards: Locator;

    constructor(page: Page) {
        this.page = page;

        this.profileSkillInput = page.locator("#pomidorqa-profile-skill-input");
        this.profileSkillTypeSelect = page.locator("#pomidorqa-profile-skill-type");
        this.profileSkillSubmit = page.getByRole("button", { name: "Добавить" });
        this.profileCanHelpSkills = page.getByTestId("can-help-skills");

        this.slotsDateInput = page.locator("#pomidorqa-slots-date");
        this.slotsTimeInput = page.locator("#pomidorqa-slots-time");
        this.slotsAddSubmit = page.getByRole("button", { name: "Добавить слот" });
        this.slotsCards = page.locator("[data-slot-id]");

        this.catalogFilterInput = page.locator("#pomidorqa-catalog-skill-filter");
        this.catalogFilterSubmit = page.getByRole("button", { name: "Найти" });
        this.catalogCards = page.getByTestId("person-card");

        this.personName = page.getByRole("heading", { level: 1 });

        this.bookingCalendarDays = page
            .getByRole("group", { name: "Дни со слотами" })
            .getByRole("button");

        this.bookingCalendarTimes = page
            .getByRole("group", { name: "Время слотов" })
            .getByRole("button");

        this.bookingConfirmDialog = page.getByRole("dialog");
        this.bookingConfirmButton = page
            .getByRole("dialog")
            .getByRole("button", { name: "Подтвердить" });

        this.bookingConfirmSuccess = page.getByRole("dialog").getByRole("status");
        this.bookingConfirmError = page.getByRole("dialog").getByRole("alert");

        this.bookingsUpcomingSection = page.getByTestId("upcoming-meetings");
        this.bookingsCards = this.bookingsUpcomingSection.locator("[data-booking-id]");
    }

    async openProfile(): Promise<void> {
        await this.page.goto(ROUTES.profile);
    }

    async openSlots(): Promise<void> {
        await this.page.goto(ROUTES.slots);
    }

    async openBookings(): Promise<void> {
        await this.page.goto(ROUTES.bookings);
    }

    async addCanHelpSkill(skillTag: string): Promise<void> {
        await this.profileSkillInput.fill(skillTag);
        await this.profileSkillTypeSelect.selectOption("can_help");
        await this.profileSkillSubmit.click();
    }

    async addSlot(date: string, time: string): Promise<void> {
        await this.slotsDateInput.fill(date);
        await this.slotsTimeInput.fill(time);
        await this.slotsAddSubmit.click();
    }

    personCard(name: string): Locator {
        return this.catalogCards.filter({ hasText: name });
    }

    async findPersonBySkill(skillTag: string): Promise<void> {
        await this.catalogFilterInput.fill(skillTag);
        await this.catalogFilterSubmit.click();
    }

    async openPersonCard(name: string): Promise<void> {
        await this.personCard(name).click();
    }

    calendarDayChip(): Locator {
        return this.bookingCalendarDays.first();
    }

    calendarTimeChip(): Locator {
        return this.bookingCalendarTimes.first();
    }

    async waitForCalendarSlot(): Promise<Locator> {
        const dayChip = this.calendarDayChip();
        await dayChip.waitFor({ state: "visible", timeout: 10_000 });
        return dayChip;
    }

    async chooseFirstSlot(): Promise<void> {
        await this.calendarDayChip().click();
        await this.calendarTimeChip().click();
    }

    async confirmBooking(): Promise<void> {
        await this.bookingConfirmButton.click();
    }

    bookingCardName(): Locator {
        return this.bookingsCards.first().locator("p").first();
    }
}