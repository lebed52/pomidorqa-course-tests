import { Locator, Page } from "@playwright/test";
import { ROUTES } from "../helpers/user";

export class MySlotsPage {
    page: Page;
    slotsDateInput: Locator;
    slotsTimeInput: Locator;
    slotsAddSubmit: Locator;
    slotsCard: Locator;

    constructor(page: Page) {
        this.page = page;
        this.slotsDateInput = page.locator("#pomidorqa-slots-date");
        this.slotsTimeInput = page.locator("#pomidorqa-slots-time");
        this.slotsAddSubmit = page.getByRole("button", { name: "Добавить слот" });
        this.slotsCard = page.locator("[data-slot-id]");
    }

    async save() {
        const saved = this.page.waitForResponse(
          (response) => response.url().endsWith("/pomidorqa/my-slots") && response.request().method() === "POST"
        );
        await this.slotsAddSubmit.click();
        await saved;
      }

    async addSlot(date: string, time: string) {
        const added = this.page.waitForResponse(
            (response) => response.url().endsWith(ROUTES.mySlots) && response.request().method() === "POST"
          );
        await this.slotsDateInput.fill(date);
        await this.slotsTimeInput.fill(time);
        await this.slotsAddSubmit.click();
        await added;
      }
}
