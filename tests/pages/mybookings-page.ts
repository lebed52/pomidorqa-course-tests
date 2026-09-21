import { Locator, Page } from "@playwright/test";

export class MyBookingsPage {
    page: Page;
    upcomingSection: Locator;
    cardName: Locator;
    private readonly url = "/pomidorqa/bookings";

    constructor(page: Page) {
        this.page = page;
        this.upcomingSection = page.getByTestId("upcoming-meetings");
        this.cardName = this.upcomingSection.locator("[data-booking-id]").first().locator("p").first();
    }

    async goto() {
        await this.page.goto(this.url);
    }
}