import { expect, type Locator, type Page } from "@playwright/test";
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
    await expect(this.personHeading).toHaveText(name);
  }

  async openBookingDialog() {
    await expect(async () => {
      const dayChip = this.calendarDays.first();
      if (!(await dayChip.isVisible().catch(() => false))) {
        await this.page.reload();
      }
      await expect(dayChip).toBeVisible();
    }).toPass({ timeout: 10_000 });

    await this.calendarDays.first().click();
    await this.calendarTimes.first().click();
    await expect(this.confirmDialog).toBeVisible();
  }

  async confirmBooking(): Promise<"success" | "error"> {
    await this.confirmButton.click();
    await expect(this.successStatus.or(this.errorAlert)).toBeVisible({
      timeout: 15_000,
    });

    if (await this.errorAlert.isVisible().catch(() => false)) {
      return "error";
    }
    return "success";
  }

  async goto() {
    await this.page.goto(ROUTES.booking);
  }

  async verifyFirstMeetingWith(expectedName: string) {
    await expect(async () => {
      await this.goto();
      await expect(this.firstCardName).toHaveText(expectedName);
    }).toPass({ timeout: 10_000 });
  }
}
