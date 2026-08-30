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

  async addSlot(dateStr: string, timeStr: string = "12:00") {
    await this.dateInput.fill(dateStr);
    await this.timeInput.fill(timeStr);
    await this.addSubmitButton.click();
  }
}
