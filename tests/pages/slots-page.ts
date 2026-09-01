import { Locator, Page } from "@playwright/test";
import { ROUTES } from "../helpers/user";

export class SlotsPage {
  page: Page;
  dateInput: Locator;
  timeInput: Locator;
  addSubmitButton: Locator;
  firstSlotCard: Locator;

  constructor(page: Page) {
    this.page = page;
    this.dateInput = page.locator("#pomidorqa-slots-date");
    this.timeInput = page.locator("#pomidorqa-slots-time");
    this.addSubmitButton = page.getByRole("button", {
      name: "Добавить слот",
    });
    this.firstSlotCard = page.locator("[data-slot-id]").first();
  }

  async goto() {
    await this.page.goto(ROUTES.slots);
  }

  /**
   * Добавляет свободный слот.
   * @param time Время слота (например, "12:00")
   * @param customDate Необязательная дата в формате YYYY-MM-DD. По умолчанию — завтрашний день.
   */
  async addSlot(time: string, customDate?: string) {
    let targetDate = customDate;

    if (!targetDate) {
      const tomorrow = new Date(Date.now() + 24 * 60 * 60 * 1000);
      targetDate = tomorrow.toISOString().slice(0, 10);
    }

    await this.dateInput.fill(targetDate);
    await this.timeInput.fill(time);
    await this.addSubmitButton.click();
  }
}
