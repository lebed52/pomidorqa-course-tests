import { type Locator, type Page } from "@playwright/test";

const SLOTS = "/pomidorqa/profile/slots";
const BOOKING = "/pomidorqa/bookings";

export class BookingPage {
  page: Page;

  readonly slotsDateInput: Locator;
  readonly slotsTimeInput: Locator;
  readonly lotsAddSubmit: Locator;
  readonly slotsCard : Locator;
  
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


  constructor(page: Page) {
    this.page = page;
    this.slotsDateInput = page.locator("#pomidorqa-slots-date");
    this.slotsTimeInput = page.locator("#pomidorqa-slots-time");
    this.lotsAddSubmit = page.getByRole("button", { name: "Добавить слот" });
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
    
    this.bookingsCardName = page
      .getByTestId("upcoming-meetings")
      .locator("[data-booking-id]")
      .first()
      .locator("p")
      .first();

  }
  async openSlots() {
    await this.page.goto(SLOTS);
  }
  
  async openBooking() {
    await this.page.goto(BOOKING);
  }

}

