import { type Locator, type Page } from "@playwright/test";

export class SlotsPage {
    page: Page;
    dateInput: Locator;
    timeInput: Locator;
    addSubmit: Locator;
    card: Locator;

constructor(page: Page) {
    this.page = page;
    this.dateInput = page.locator("#pomidorqa-slots-date");
    this.timeInput = page.locator("#pomidorqa-slots-time");
    this.addSubmit = page.getByRole("button", { name: "Добавить слот" });
    this.card = page.locator("[data-slot-id]");    

}

  async addSlotForTomorrow (time: string) {
    const tomorrow = new Date(Date.now() + 24 * 60 * 60 * 1000);
    const date = tomorrow.toISOString().slice(0, 10);
    await this.dateInput.fill(date);
    await this.timeInput.fill(time);
    
  };

}
