import { type Locator, type Page, expect } from "@playwright/test";
import { ROUTES } from "../helpers/user";

export class BookingPage {
  page: Page;
  // элементы каталога
  filterInput: Locator;
  filterSubmitButton: Locator;
  personHeading: Locator;

  // элементы календаря
  calendarDays: Locator;
  calendarTimes: Locator;

  // модалка подтверждения
  confirmDialog: Locator;
  confirmButton: Locator;
  successStatus: Locator;
  errorAlert: Locator;

  // раздел Мои встречи
  upcomingSection: Locator;
  firstCardName: Locator;

  upcomingBookings: Locator;
  pastMeetingsSection: Locator;
  pastBookings: Locator;

  constructor(page: Page) {
    this.page = page;
    this.filterInput = page.locator("#pomidorqa-catalog-skill-filter");
    this.filterSubmitButton = page.getByRole("button", { name: "Найти" });
    this.personHeading = page.getByRole("heading", { level: 1 });

    this.calendarDays = page
      .getByRole("group", { name: "Дни со слотами" })
      .getByRole("button");
    this.calendarTimes = page
      .getByRole("group", { name: "Время слотов" })
      .getByRole("button");

    this.confirmDialog = page.getByRole("dialog");
    this.confirmButton = page
      .getByRole("dialog")
      .getByRole("button", { name: "Подтвердить" });
    this.successStatus = page.getByRole("dialog").getByRole("status");
    this.errorAlert = page.getByRole("dialog").getByRole("alert");

    this.upcomingSection = page.getByTestId("upcoming-meetings");

    this.upcomingBookings = this.upcomingSection.locator("[data-booking-id]");
    this.pastMeetingsSection = page
      .locator("section")
      .filter({ hasText: "Прошедшие и отменённые" });
    this.pastBookings = this.pastMeetingsSection.locator("[data-booking-id]");
    this.firstCardName = this.upcomingBookings.first().locator("p").first();
  }

  getPersonCard(name: string): Locator {
    return this.page.getByTestId("person-card").filter({ hasText: name });
  }

  async searchBySkill(skillTag: string) {
    await this.filterInput.fill(skillTag);
    await this.filterSubmitButton.click();
  }

  async openPersonCard(name: string) {
    await this.getPersonCard(name).click();
  }

  async navigateToHostProfile(skillTag: string, hostName: string) {
    await this.searchBySkill(skillTag);
    await this.openPersonCard(hostName);
  }

  async reloadIfHidden(locator: Locator): Promise<Locator> {
    const isVisible = await locator.isVisible().catch(() => false);
    if (!isVisible) {
      await this.page.reload();
    }
    return locator;
  }

  async ensureCalendarVisible(): Promise<Locator> {
    return this.reloadIfHidden(this.calendarDays.first());
  }

  async waitForBookingStatus(): Promise<boolean> {
    const statusLocator = this.successStatus.or(this.errorAlert);
    await statusLocator.waitFor({ state: "visible", timeout: 15_000 });
    return await this.successStatus.isVisible().catch(() => false);
  }

  async loadUpcomingMeetingsAndEnsureData(expectedName: string) {
    await this.goto();
    const firstCardName = this.firstCardName;
    const hasText =
      (await firstCardName.textContent().catch(() => null))?.includes(
        expectedName,
      ) ?? false;
    if (!hasText) {
      await this.page.reload();
    }
  }

  async selectFirstSlot() {
    await expect(async () => {
      await this.calendarDays.first().click();
      await this.calendarTimes.first().click();
      await expect(this.confirmDialog).toBeVisible();
    }).toPass({ timeout: 15_000 });
  }

  async confirmBooking() {
    await this.confirmButton.click();
  }

  async goto() {
    await this.page.goto(ROUTES.booking);
  }

  upcomingBookingByParticipant(name: string): Locator {
    return this.upcomingBookings.filter({ hasText: name });
  }

  pastBookingByParticipant(name: string): Locator {
    return this.pastBookings.filter({ hasText: name });
  }

  async cancelBooking(name: string) {
    const booking = this.upcomingBookingByParticipant(name);
    await booking.getByRole("button", { name: "Отменить" }).click();
    await booking.waitFor({ state: "detached" });
  }
}
