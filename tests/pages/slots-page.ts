import { Locator, Page } from "@playwright/test";
import { ROUTES } from "../helpers/user";

function toDateInputValue(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

function getTomorrowDate(): string {
  const tomorrow = new Date();

  tomorrow.setDate(tomorrow.getDate() + 1);

  return toDateInputValue(tomorrow);
}

export class SlotsPage {
  readonly dateInput: Locator;
  readonly timeInput: Locator;
  readonly addSubmitButton: Locator;
  readonly firstSlotCard: Locator;

  constructor(readonly page: Page) {
    this.dateInput = page.locator("#pomidorqa-slots-date");
    this.timeInput = page.locator("#pomidorqa-slots-time");

    this.addSubmitButton = page.getByRole("button", {
      name: "Добавить слот",
    });

    this.firstSlotCard = page
      .locator("[data-slot-id]")
      .first();
  }

  async goto() {
    await this.page.goto(ROUTES.slots);
  }

  async addSlot(time: string, dateStr?: string) {
    const targetDate = dateStr ?? getTomorrowDate();

    await this.dateInput.fill(targetDate);
    await this.timeInput.fill(time);
    await this.addSubmitButton.click();
  }
}