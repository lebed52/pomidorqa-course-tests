import { type Page } from "@playwright/test";

export class BookingPage {
  constructor(private readonly page: Page) {}

  catalogFilterInput = () =>
    this.page.locator("#pomidorqa-catalog-skill-filter");

  catalogFilterSubmit = () =>
    this.page.getByRole("button", { name: "Найти" });

  catalogCard = (name: string) =>
    this.page
      .locator('[data-testid="person-card"]')
      .filter({ hasText: name });

  personName = () =>
    this.page.getByRole("heading", { level: 1 });

  slotDateInput = () =>
    this.page.locator('input[type="date"]');

  slotTimeInput = () =>
    this.page.locator('input[type="time"]');

  slotAddSubmit = () =>
    this.page.getByRole("button", { name: "Добавить слот" });

  slotCard = () =>
    this.page.locator('[data-slot-status="free"]').first();

  freeSlot = () => this.slotCard();

  bookingDay = (date: string) =>
    this.page.locator(`button[data-date="${date}"]`);

  anyTime = () =>
    this.page.locator("button[data-slot-id]").first();

  bookingDialog = () =>
    this.page.getByRole("dialog");

  bookingConfirmButton = () =>
    this.page.getByRole("button", { name: "Подтвердить" });

  bookingSuccess = () =>
    this.bookingDialog().getByText(/Забронировано|успешно/i);

  bookingError = () =>
    this.bookingDialog().getByText(
      /забронировали|занят|выбери другой/i,
    );

  upcomingSection = () =>
    this.page.locator('[data-testid="upcoming-meetings"]');

  upcomingBookingCard = (name: string) =>
    this.upcomingSection()
      .locator("[data-booking-id]")
      .filter({ hasText: name });

  upcomingCardName = (name: string) =>
    this.upcomingBookingCard(name)
      .getByRole("paragraph")
      .first();

  cancelBookingButton = (name: string) =>
    this.upcomingBookingCard(name).getByRole("button", {
      name: "Отменить",
    });
    
    pastBookingsSection = () =>
      this.page
        .locator("section")
        .filter({ hasText: "Прошедшие и отменённые" });
    
    pastBookingCard = (name: string) =>
      this.pastBookingsSection()
        .locator("[data-booking-id]")
        .filter({ hasText: name });

  async addSlot(date: string, time: string) {
    await this.slotDateInput().fill(date);
    await this.slotTimeInput().fill(time);
    await this.slotAddSubmit().click();
  }

  async searchBySkill(skillTag: string) {
    await this.catalogFilterInput().fill(skillTag);
    await this.catalogFilterSubmit().click();
  }

  async openHostCard(hostName: string) {
    await this.catalogCard(hostName).click();
  }

  async selectDayAndTime(slotDate: string) {
    const dayButton = this.bookingDay(slotDate);
    const timeButton = this.anyTime();
    const deadline = Date.now() + 15_000;
  
    for (;;) {
      try {
        await dayButton.click({ timeout: 5_000 });
        await timeButton.click({ timeout: 5_000 });
        await this.bookingDialog().waitFor({
          state: "visible",
          timeout: 3_000,
        });
        return;
      } catch (error) {
        if (Date.now() > deadline) {
          throw error;
        }
      }
    }
  }

  async confirmBooking() {
    await this.bookingConfirmButton().click();
  }

  async cancelBooking(name: string) {
    await this.cancelBookingButton(name).click();
  }

  async goToBookings() {
    await this.page.goto("/pomidorqa/bookings");
  }
}