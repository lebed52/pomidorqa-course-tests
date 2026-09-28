import { Locator, Page } from "@playwright/test";
import { ROUTES } from "../helpers/user";

export class BookingPage {
    page: Page;
    catalogFilterInput: Locator;
    catalogFilterSubmit: Locator;
    catalogCard: Locator;
    personName: Locator;
    bookingConfirmButton: Locator;
    bookingConfirmSuccess: Locator;
    bookingConfirmError: Locator;
    bookingsUpcomingSection: Locator;
    bookingsCard: Locator;
    bookingsCardName: Locator;
    bookingsCardCancelButton: Locator;

    constructor(page: Page) {
        this.page = page;
        this.catalogFilterInput = page.locator('#pomidorqa-catalog-skill-filter');
        this.catalogFilterSubmit = page.getByRole('button', {name: 'Найти'});
        this.catalogCard = page.getByTestId("person-card");
        this.personName = page.getByRole("heading", {level: 1});
        this.bookingConfirmButton = page.getByRole("button", { name: "Подтвердить" });
        this.bookingConfirmSuccess = page.getByRole("dialog").getByRole("status");
        this.bookingConfirmError = page.getByRole("dialog").getByRole("alert");
        this.bookingsUpcomingSection = page.getByTestId("upcoming-meetings");
        this.bookingsCard = this.bookingsUpcomingSection.locator("[data-booking-id]");
        this.bookingsCardName = this.bookingsCard.first().locator("p").first();
        this.bookingsCardCancelButton = this.bookingsCard.first().locator("button").first();
    }

    async filterCatalog(skillTag: string) {
        await this.catalogFilterInput.fill(skillTag);
        await this.catalogFilterSubmit.click();
    }

    async bookingCancel() {
        const bookingCancel = this.page.waitForResponse(
          (response) =>
            response.url().endsWith(ROUTES.bookings) && response.request().method() === "POST"
        );
        await this.bookingsCardCancelButton.first().click();
        await bookingCancel;
    }
}