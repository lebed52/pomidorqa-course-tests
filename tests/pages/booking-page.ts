import { type Page, type Locator, expect } from "@playwright/test";
import { ROUTES } from "../helpers/user";

export class BookingPage {
  private readonly catalogFilterInput: Locator;
  private readonly catalogFilterButton: Locator;
  
  readonly personName: Locator;
  private readonly dayChip: Locator;
  private readonly timeChip: Locator;
  
  readonly confirmDialog: Locator;
  private readonly confirmButton: Locator;
  readonly confirmSuccess: Locator;
  readonly confirmError: Locator;
  
  private readonly bookingsSection: Locator;
  readonly upcomingBookings: Locator;
  readonly firstBookingName: Locator;
  private readonly firstBookingCancelButton: Locator;

  private readonly pastMeetingsSection: Locator;
  readonly pastBookings: Locator;
  readonly firstPastBookingName: Locator;

  constructor(readonly page: Page) {
    this.catalogFilterInput = page.locator("#pomidorqa-catalog-skill-filter");
    this.catalogFilterButton = page.getByRole("button", { name: "Найти" });
    this.personName = page.getByRole("heading", { level: 1 });
    this.dayChip = page.getByRole("group", { name: "Дни со слотами" }).getByRole("button").first();
    this.timeChip = page.getByRole("group", { name: "Время слотов" }).getByRole("button").first();
    this.confirmDialog = page.getByRole("dialog");
    this.confirmButton = this.confirmDialog.getByRole("button", { name: "Подтвердить" });
    this.confirmSuccess = this.confirmDialog.getByRole("status");
    this.confirmError = this.confirmDialog.getByRole("alert");
    
    this.bookingsSection = page.getByTestId("upcoming-meetings");
    this.upcomingBookings = this.bookingsSection.locator("[data-booking-id]");
    this.firstBookingName = this.upcomingBookings.first().locator("p").first();
    this.firstBookingCancelButton = this.upcomingBookings.first().getByRole("button", { name: "Отменить" });

    this.pastMeetingsSection = page.locator("section").filter({ hasText: "Прошедшие и отменённые" });
    this.pastBookings = this.pastMeetingsSection.locator("[data-booking-id]");
    this.firstPastBookingName = this.pastBookings.first().locator("p").first();
  }

  async searchCatalog(skillTag: string) {
    await this.catalogFilterInput.fill(skillTag);
    await this.catalogFilterButton.click();
  }

  async openPerson(name: string) {
    await this.page.getByTestId("person-card").filter({ hasText: name }).click();
    await this.personName.waitFor({ state: "visible" });
  }

  async pickFirstSlot(retryTimeoutMs = 10_000) {
    if (await this.confirmDialog.isVisible().catch(() => false)) return;
    const deadline = Date.now() + retryTimeoutMs;
    for (;;) {
      try {
        await this.dayChip.waitFor({ state: "visible", timeout: 1_000 });
        break;
      } catch {
        if (Date.now() > deadline) {
          throw new Error(`Слот не появился вовремя. URL: ${this.page.url()}`);
        }
        await this.page.reload();
      }
    }
    await this.dayChip.click();
    await this.timeChip.waitFor({ state: "visible", timeout: 5000 });
    await this.timeChip.click();
  }

  async confirmBooking() {
    // Ждем, пока кнопка станет видимой, чтобы избежать флейки
    await expect(this.confirmButton).toBeVisible();
    await this.confirmButton.click();
  }

  async waitForBookingResult(timeout = 15_000): Promise<"success" | "error"> {
    await this.confirmSuccess.or(this.confirmError).waitFor({ state: "visible", timeout });
    return (await this.confirmSuccess.isVisible().catch(() => false)) ? "success" : "error";
  }

  async goToBookings() {
    await this.page.goto(ROUTES.bookings);
  }

  async cancelFirstBooking() {
    await this.firstBookingCancelButton.click();
  }
}