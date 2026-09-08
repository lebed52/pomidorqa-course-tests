import { type Locator, type Page } from "@playwright/test";
import { ROUTES } from "../helpers/user";

export class SlotsPage {
  readonly dateInput: Locator;
  readonly timeInput: Locator;
  readonly addSlotButton: Locator;
  readonly slotCards: Locator;

  constructor(readonly page: Page) {
    this.dateInput = page.locator("#pomidorqa-slots-date");
    this.timeInput = page.locator("#pomidorqa-slots-time");
    this.addSlotButton = page.getByRole("button", { name: "Добавить слот" });
    this.slotCards = page.locator("[data-slot-id]");
  }

  async open() {
    await this.page.goto(ROUTES.slots);
  }

  async addSlot(date: string, time: string) {
    await this.dateInput.fill(date);
    await this.timeInput.fill(time);
    await this.addSlotButton.click();
  }
}
