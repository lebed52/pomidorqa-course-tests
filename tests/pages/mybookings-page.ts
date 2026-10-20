import { Locator, Page } from "@playwright/test";

export class MyBookingsPage {
    page: Page;
    upcomingSection: Locator;
    cardName: Locator;
    canceledSection: Locator;
    private readonly url = "/pomidorqa/bookings";

    constructor(page: Page) {
        this.page = page;
        this.upcomingSection = page.getByTestId("upcoming-meetings");
        this.cardName = this.upcomingSection.locator("[data-booking-id]").first().locator("p").first();
        this.canceledSection = page.locator("section").filter({ has: page.getByRole("heading", { name: "Прошедшие и отменённые", level: 2 }) });
    }

    async goto() {
        await this.page.goto(this.url);
    }

    async cancelBooking(name: string) {
        await this.upcomingCard(name).getByRole("button", { name: "Отменить" }).click();
    }

    upcomingCard(name: string) {
        return this.upcomingSection.locator("[data-booking-id]").filter({ hasText: name });
    }

    canceledCard(name: string) {
        return this.canceledSection.locator("[data-booking-id]").filter({ hasText: name });
    }
}
