import {Locator, Page} from "@playwright/test";

export class BookingPage {
    readonly page: Page;

    constructor(page: Page) {
        this.page = page;
    }

    get slotsDateInput(): Locator {
        return this.page.locator("#pomidorqa-slots-date");
    }

    get slotsTimeInput(): Locator {
        return this.page.locator("#pomidorqa-slots-time");
    }

    get slotsAddSubmit(): Locator {
        return this.page.getByRole("button", { name: "Добавить слот" });
    }

    get slotsCard(): Locator {
        return this.page.locator("[data-slot-id]");
    }

    get catalogFilterInput(): Locator {
        return this.page.locator("#pomidorqa-catalog-skill-filter");
    }

    get catalogFilterSubmit(): Locator {
        return this.page.getByRole("button", { name: "Найти" });
    }

    get catalogCard(): Locator {
        return this.page.getByTestId("person-card");
    }

    get personName(): Locator {
        return this.page.getByRole("heading", { level: 1 });
    }

    get bookingCalendarDay(): Locator {
        return this.page.getByRole("group", { name: "Дни со слотами" }).getByRole("button");
    }

    get bookingCalendarTime(): Locator {
        return this.page.getByRole("group", { name: "Время слотов" }).getByRole("button");
    }

    get bookingConfirmDialog(): Locator {
        return this.page.getByRole("dialog");
    }

    get bookingConfirmButton(): Locator {
        return this.page.getByRole("dialog").getByRole("button", { name: "Подтвердить" });
    }

    get bookingConfirmSuccess(): Locator {
        return this.page.getByRole("dialog").getByRole("status");
    }

    get bookingConfirmError(): Locator {
        return this.page.getByRole("dialog").getByRole("alert");
    }

    get bookingsUpcomingSection(): Locator {
        return this.page.getByTestId("upcoming-meetings");
    }

    get bookingsCardName(): Locator {
        return this.bookingsUpcomingSection.locator("[data-booking-id]").first().locator("p").first();
    }
}

