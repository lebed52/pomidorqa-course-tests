import { Locator, Page } from "@playwright/test";

export class SlotsPage {
    page: Page;
    dateInput: Locator;
    timeInput: Locator;
    addSlotButton: Locator;
    slotCards: Locator;
    private readonly url = "/pomidorqa/profile/slots";

    constructor(page: Page) {
        this.page = page;
        this.dateInput = page.locator("#pomidorqa-slots-date");
        this.timeInput = page.locator("#pomidorqa-slots-time");
        this.addSlotButton = page.getByRole("button", { name: "Добавить слот" });
        this.slotCards = page.locator("[data-slot-id]");
    }

    async goto() {
        await this.page.goto(this.url);
    }

    async addSlot(date: string, time: string) {
        await this.dateInput.fill(date);
        await this.timeInput.fill(time);
        await this.addSlotButton.click();
    }
}