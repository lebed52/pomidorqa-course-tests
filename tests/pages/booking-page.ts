import { expect, Locator, type Page } from "@playwright/test";
import { ROUTES } from "../helpers/user";

export class BookingPage {
    page: Page;
    profileSkillInput: Locator;
    profileSkillTypeSelect: Locator;
    profileSkillSubmit: Locator;
    profileCanHelpSkills: Locator;

    slotsDateInput: Locator;
    slotsTimeInput: Locator;
    slotsAddSubmit: Locator;
    slotsCard: Locator;

    catalogFilterInput: Locator;
    catalogFilterSubmit: Locator;
    catalogCard: Locator;

    personName: Locator;

    bookingCalendarDay: Locator;
    bookingCalendarTime: Locator;

    bookingConfirmDialog: Locator;
    bookingConfirmButton: Locator;
    bookingConfirmSuccess: Locator;
    bookingConfirmError: Locator;

    bookingsUpcomingSection: Locator;
    bookingsCardName: Locator;

    constructor(page: Page) {
        this.page = page;

        this.profileSkillInput = page.locator("#pomidorqa-profile-skill-input");
        this.profileSkillTypeSelect = page.locator("#pomidorqa-profile-skill-type");
        this.profileSkillSubmit = page.getByRole("button", { name: "Добавить" });
        this.profileCanHelpSkills = page.getByTestId("can-help-skills");

        this.slotsDateInput = page.locator("#pomidorqa-slots-date");
        this.slotsTimeInput = page.locator("#pomidorqa-slots-time");
        this.slotsAddSubmit = page.getByRole("button", { name: "Добавить слот" });
        this.slotsCard = page.locator("[data-slot-id]");

        this.catalogFilterInput = page.locator("#pomidorqa-catalog-skill-filter");
        this.catalogFilterSubmit = page.getByRole("button", { name: "Найти" });
        this.catalogCard = page.getByTestId("person-card");

        this.personName = page.getByRole("heading", { level: 1 });

        this.bookingCalendarDay = page.getByRole("group", { name: "Дни со слотами" }).getByRole("button");
        this.bookingCalendarTime = page.getByRole("group", { name: "Время слотов" }).getByRole("button");

        this.bookingConfirmDialog = page.getByRole("dialog");
        this.bookingConfirmButton = page.getByRole("dialog").getByRole("button", { name: "Подтвердить" });
        this.bookingConfirmSuccess = page.getByRole("dialog").getByRole("status");
        this.bookingConfirmError = page.getByRole("dialog").getByRole("alert");

        this.bookingsUpcomingSection = page.getByTestId("upcoming-meetings");
        this.bookingsCardName = this.bookingsUpcomingSection.locator("[data-booking-id]").first().locator("p").first();
    }

    async goto() {
        await this.page.goto(ROUTES.booking);
    }
    
    async addSlot(date: string, time: string): Promise<void> {
        await this.page.goto(ROUTES.slots);
        await this.slotsDateInput.fill(date);
        await this.slotsTimeInput.fill(time);
        await this.slotsAddSubmit.click();
    }
    
    getHostCard(hostName: string): Locator {
        return this.catalogCard.filter({ hasText: hostName });
    }

    async searchBySkill(skillTag: string): Promise<void> {
    await this.catalogFilterInput.fill(skillTag);
    await this.catalogFilterSubmit.click();
    }

    async openHostCard(hostName: string): Promise<void> {
    await this.getHostCard(hostName).click();
    }

    async waitForFirstAvailableDay(timeout = 10_000): Promise<void> {
        await expect(async () => {
            const day = this.bookingCalendarDay.first();

            if (!(await day.isVisible().catch(() => false))) {
            await this.page.reload();
            }

            await expect(day).toBeVisible();
        }).toPass({ timeout });
    }

    async selectFirstAvailableSlot(): Promise<void> {
    await this.bookingCalendarDay.first().click();
    await this.bookingCalendarTime.first().click();
    }

    getMeetingCard(participantName: string): Locator {
        return this.bookingsUpcomingSection
            .locator('[data-booking-id]')
            .filter({ hasText: participantName });
        }

    async gotoMeetings(): Promise<void> {
        await this.page.goto(ROUTES.booking);
        }
}