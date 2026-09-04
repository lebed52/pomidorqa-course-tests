import { type Locator, type Page } from "@playwright/test";

export class BookingPage {
  page: Page;

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

  slotsDateInput: Locator;
  slotsTimeInput: Locator;
  slotsAddSubmit: Locator;
  slotsCard: Locator;

  constructor(page: Page) {
    this.page = page;

    this.catalogFilterInput = page.locator("#pomidorqa-catalog-skill-filter");
    this.catalogFilterSubmit = page.getByRole("button", { name: "Найти" });
    this.catalogCard = page.getByTestId("person-card");

    this.personName = page.getByRole("heading", { level: 1 });

    this.bookingCalendarDay = page
      .getByRole("group", { name: "Дни со слотами" })
      .getByRole("button");

    this.bookingCalendarTime = page
      .getByRole("group", { name: "Время слотов" })
      .getByRole("button");

    this.bookingConfirmDialog = page.getByRole("dialog");
    this.bookingConfirmButton = page
      .getByRole("dialog")
      .getByRole("button", { name: "Подтвердить" });
    this.bookingConfirmSuccess = page.getByRole("dialog").getByRole("status");
    this.bookingConfirmError = page.getByRole("dialog").getByRole("alert");

    this.bookingsUpcomingSection = page.getByTestId("upcoming-meetings");
    this.bookingsCardName = this.bookingsUpcomingSection
      .locator("[data-booking-id]")
      .first()
      .locator("p")
      .first();

    this.slotsDateInput = page.locator("#pomidorqa-slots-date");
    this.slotsTimeInput = page.locator("#pomidorqa-slots-time");
    this.slotsAddSubmit = page.getByRole("button", { name: "Добавить слот" });
    this.slotsCard = page.locator("[data-slot-id]");
  }

  async searchBySkill(skill: string) {
    await this.catalogFilterInput.fill(skill);
    await this.catalogFilterSubmit.click();
  }

  async openHostCard(hostName: string) {
    await this.catalogCard.filter({ hasText: hostName }).click();
  }

  async selectFirstSlot() {
    const deadline = Date.now() + 30_000;

    while (true) {
      try {
        const dayChip = this.bookingCalendarDay.first();

        if (!(await dayChip.isVisible().catch(() => false))) {
          await this.page.reload();
        }

        await dayChip.waitFor({ state: "visible" });
        await dayChip.click();

        const timeSlot = this.bookingCalendarTime.first();

        await timeSlot.waitFor({ state: "visible" });
        await timeSlot.click();

        await this.bookingConfirmDialog.waitFor({ state: "visible", timeout: 5_000 });
        return;
      } catch (err) {
        if (Date.now() > deadline) throw err;
      }
    }
  }

  async confirmBooking() {
    await this.bookingConfirmButton.click();
  }

  async addSlot(time: string) {
    await this.page.goto("/pomidorqa/profile/slots");

    const tomorrow = new Date(Date.now() + 24 * 60 * 60 * 1000);
    const date = tomorrow.toISOString().slice(0, 10);

    await this.slotsDateInput.fill(date);
    await this.slotsTimeInput.fill(time);
    await this.slotsAddSubmit.click();
  }

  async gotoBookings() {
    await this.page.goto("/pomidorqa/bookings");
  }
}