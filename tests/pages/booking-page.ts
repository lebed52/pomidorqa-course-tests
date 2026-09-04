import { type Locator, type Page } from "@playwright/test";
import { ROUTES } from "../helpers/user";

export class BookingPage {
  readonly catalogFilterInput: Locator;
  readonly catalogFilterButton: Locator;
  readonly personCards: Locator;
  readonly personName: Locator;
  readonly calendarDays: Locator;
  readonly calendarTimes: Locator;
  readonly confirmDialog: Locator;
  readonly confirmButton: Locator;
  readonly confirmSuccess: Locator;
  readonly confirmError: Locator;
  readonly upcomingMeetings: Locator;

  constructor(readonly page: Page) {
    this.catalogFilterInput = page.locator("#pomidorqa-catalog-skill-filter");
    this.catalogFilterButton = page.getByRole("button", { name: "Найти" });
    this.personCards = page.getByTestId("person-card");
    this.personName = page.getByRole("heading", { level: 1 });
    this.calendarDays = page.getByRole("group", { name: "Дни со слотами" }).getByRole("button");
    this.calendarTimes = page.getByRole("group", { name: "Время слотов" }).getByRole("button");
    this.confirmDialog = page.getByRole("dialog");
    this.confirmButton = this.confirmDialog.getByRole("button", { name: "Подтвердить" });
    this.confirmSuccess = this.confirmDialog.getByRole("status");
    this.confirmError = this.confirmDialog.getByRole("alert");
    this.upcomingMeetings = page.getByTestId("upcoming-meetings");
  }

  personCard(name: string): Locator {
    return this.personCards.filter({ hasText: name });
  }

  firstMeetingName(): Locator {
    return this.upcomingMeetings.locator("[data-booking-id]").first().locator("p").first();
  }

  async searchBySkill(skillTag: string) {
    await this.catalogFilterInput.fill(skillTag);
    await this.catalogFilterButton.click();
  }

  async openPersonCard(name: string) {
    await this.personCard(name).click();
  }

  // Календарь перерисовывается, когда слоты доезжают с сервера, и клик уходит в старый DOM:
  // кнопки нажались, а окно брони не открылось. Поэтому цепочка повторяется целиком.
  async openFirstSlot() {
    const deadline = Date.now() + 20_000;

    for (;;) {
      try {
        await this.calendarDays.first().click({ timeout: 5_000 });
        await this.calendarTimes.first().click({ timeout: 5_000 });
        await this.confirmDialog.waitFor({ state: "visible", timeout: 5_000 });
        return;
      } catch (error) {
        if (Date.now() > deadline) {
          throw error;
        }
        await this.page.reload();
      }
    }
  }

  async confirmBooking() {
    await this.confirmButton.click();
  }

  async openMyMeetings() {
    await this.page.goto(ROUTES.bookings);
  }
}
