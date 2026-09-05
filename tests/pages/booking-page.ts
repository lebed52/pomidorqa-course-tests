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
  
  cancelBookingButton = () =>
    this.page.getByRole("button", { name: "Отменить" });

  bookingSuccess = () =>
    this.bookingDialog().getByText(/Забронировано|успешно/i);

  bookingError = () =>
    this.bookingDialog().getByText(
      /забронировали|занят|выбери другой/i,
    );

  upcomingSection = () =>
    this.page.locator('[data-testid="upcoming-meetings"]');

  upcomingCardName = () =>
    this.upcomingSection().locator('[data-booking-id]').getByRole("paragraph").first();

  pastBookingsSection = () =>
    this.page.getByRole("heading", { name: "Прошедшие и отменённые" });

  pastBookingCard = (name: string) =>
    this.page.locator('[data-booking-id]').filter({ hasText: name });

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
  
    await dayButton.waitFor({
      state: "visible",
      timeout: 10000,
    });
  
    await dayButton.click();
  
    const timeButton = this.anyTime();
  
    await timeButton.waitFor({
      state: "visible",
      timeout: 10000,
    });
  
    await timeButton.click();
  }

  async confirmBooking() {
    await this.bookingConfirmButton().click();
  }
  
  async cancelBooking() {
    await this.cancelBookingButton().click();
  }
  
  async goToBookings() {
    await this.page.goto("/pomidorqa/bookings");
  }
}