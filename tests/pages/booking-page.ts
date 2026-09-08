import { Locator, Page } from "@playwright/test";

export class BookingPage {
    page: Page;

    bookingCalendarDay: Locator;
    bookingCalendarTime: Locator;
    bookingConfirmDialog: Locator;
    bookingConfirmButton: Locator;
    bookingConfirmSuccess: Locator;
    bookingConfirmError: Locator;
    bookingUpcomingSection: Locator;
    bookingCardName: Locator;

    bookingSlotsDateInput: Locator;
    bookingSlotsTimeInput: Locator;
    bookingSlotsAddSubmit: Locator;
    bookingSlotsCard: Locator;

    bookingCatalogFilterInput: Locator;
    bookingCatalogFilterSubmit: Locator;
    bookingCatalogCard: Locator;

    bookingPersonName: Locator;

    constructor( page: Page ) {
        this.page = page;

        this.bookingCalendarDay = page.getByRole("group", { name: "Дни со слотами" }).getByRole("button");
        this.bookingCalendarTime = page.getByRole("group", { name: "Время слотов" }).getByRole("button");
        this.bookingConfirmDialog = page.getByRole("dialog");
        this.bookingConfirmButton = page.getByRole("dialog").getByRole("button", { name: "Подтвердить" });
        this.bookingConfirmSuccess = page.getByRole("dialog").getByRole("status");
        this.bookingConfirmError = page.getByRole("dialog").getByRole("alert");
        this.bookingUpcomingSection = page.getByTestId("upcoming-meetings");
        this.bookingCardName = this.bookingUpcomingSection.locator("[data-booking-id]").first().locator("p").first();

        this.bookingSlotsDateInput = page.locator("#pomidorqa-slots-date");
        this.bookingSlotsTimeInput = page.locator("#pomidorqa-slots-time");
        this.bookingSlotsAddSubmit = page.getByRole("button", { name: "Добавить слот" });
        this.bookingSlotsCard = page.locator("[data-slot-id]");

        this.bookingCatalogFilterInput = page.locator("#pomidorqa-catalog-skill-filter");
        this.bookingCatalogFilterSubmit = page.getByRole("button", { name: "Найти" });
        this.bookingCatalogCard = page.getByTestId("person-card");

        this.bookingPersonName = page.getByRole("heading", { level: 1 });
    }
}
