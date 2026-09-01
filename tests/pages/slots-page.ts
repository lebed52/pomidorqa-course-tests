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

  async addSlot(time: string) {
    await this.page.goto(ROUTES.slots);
    const tomorrow = new Date(Date.now() + 24 * 60 * 60 * 1000);
    const date = tomorrow.toISOString().slice(0, 10);
    await this.dateInput.fill(date);
    await this.timeInput.fill(time);
    await this.addSubmitButton.click();
  }
}
