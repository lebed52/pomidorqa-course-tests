import {Page, Locator} from "@playwright/test";
import { ROUTES } from "../helpers/routes";

export class BookingPage {
  readonly page: Page;

  readonly catalogFilterInput: Locator;
  readonly catalogFilterSubmit: Locator;
  readonly catalogCard: Locator;

  readonly slotsDateInput: Locator;
  readonly slotsTimeInput: Locator;
  readonly slotsAddSubmit: Locator;
  readonly slotsCard: Locator;

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

    this.catalogFilterInput = page.locator("#pomidorqa-catalog-skill-filter");
    this.catalogFilterSubmit = page.getByRole("button", { name: "Найти" });
    this.catalogCard = page.getByTestId("person-card");

    this.slotsDateInput = page.locator("#pomidorqa-slots-date");
    this.slotsTimeInput = page.locator("#pomidorqa-slots-time");
    this.slotsAddSubmit = page.getByRole("button", { name: "Добавить слот" });
    this.slotsCard = page.locator("[data-slot-id]");

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

  async gotoSlots() {
    await this.page.goto(ROUTES.slots);
  }

  async gotoBookings() {
    await this.page.goto(ROUTES.bookings);
  }

  async reload() {
    await this.page.reload();
  }

  async findSkill(skill: string) {
    await this.catalogFilterInput.fill(skill);
    await this.catalogFilterSubmit.click();
  }

  async fillDate(date: string) {
    await this.slotsDateInput.fill(date);
  }

  async fillTime(time: string) {
    await this.slotsTimeInput.fill(time);
  }

  async addSlot() {
    await this.slotsAddSubmit.click();
  }

  async openPersonCard(name: string) {
    await this.catalogCard.filter({hasText: name}).first().click();
  }

  async openBookingDialog() {
    await this.bookingCalendarDay.first().click();
    await this.bookingCalendarTime.first().click();
  }

  async confirmBooking() {
    await this.bookingConfirmButton.click();
  }
}
