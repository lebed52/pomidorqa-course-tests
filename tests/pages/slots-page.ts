import { Locator, Page } from "@playwright/test";
import { ROUTES } from "../helpers/user";

export class SlotsPage {
  readonly dateInput: Locator;
  readonly timeInput: Locator;
  readonly addSubmitButton: Locator;
  readonly firstSlotCard: Locator;

  constructor(readonly page: Page) {
    this.dateInput = page.locator("#pomidorqa-slots-date");
    this.timeInput = page.locator("#pomidorqa-slots-time");
    this.addSubmitButton = page.getByRole("button", { name: "Добавить слот" });
    this.firstSlotCard = page.locator("[data-slot-id]").first();
  }

  async goto() {
    await this.page.goto(ROUTES.slots);
  }

  async addSlot(time: string, dateStr?: string) {
    const targetDate = dateStr || new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
    await this.dateInput.fill(targetDate);
    await this.timeInput.fill(time);
    await this.addSubmitButton.click();
  }
}