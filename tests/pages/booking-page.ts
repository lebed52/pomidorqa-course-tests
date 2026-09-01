import { type Locator, type Page } from "@playwright/test";
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
    this.firstCardName = this.upcomingSection
      .locator("[data-booking-id]")
      .first()
      .locator("p")
      .first();
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

  async ensureCalendarVisible(): Promise<Locator> {
    const dayChip = this.calendarDays.first();
    const isVisible = await dayChip.isVisible({ timeout: 5000 }).catch(() => false);

    if (!isVisible) {
      await this.page.reload();
    }
    return dayChip;
  }

  async waitForBookingStatus(): Promise<boolean> {
    const statusLocator = this.successStatus.or(this.errorAlert);
    await statusLocator.waitFor({ state: "visible", timeout: 15_000 });
    return await this.successStatus.isVisible().catch(() => false);
  }

  async loadUpcomingMeetingsAndEnsureData(expectedName: string) {
    await this.goto();

    const textContext = await this.firstCardName.textContent().catch(() => null);
    const hasText = textContext ? textContext.includes(expectedName) : false;

    if (!hasText) {
      await this.page.reload();
    }
  }

  async selectFirstSlot() {
    await this.calendarDays.first().click();
    await this.calendarTimes.first().click();
  }

  async confirmBooking() {
    await this.confirmButton.click();
  }

  async goto() {
    await this.page.goto(ROUTES.booking);
  }
}
