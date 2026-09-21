import { expect, Locator, Page } from "@playwright/test";

export class BookingPage {
    page: Page;
    personName: Locator;
    calendarDay: Locator;
    calendarTime: Locator;
    confirmDialog: Locator;
    confirmButton: Locator;
    confirmSuccess: Locator;
    confirmError: Locator;

    constructor(page: Page) {
        this.page = page;
        this.personName = page.getByRole("heading", { level: 1 });
        this.calendarDay = page.getByRole("group", { name: "Дни со слотами" }).getByRole("button");
        this.calendarTime = page.getByRole("group", { name: "Время слотов" }).getByRole("button");
        this.confirmDialog = page.getByRole("dialog");
        this.confirmButton = page.getByRole("dialog").getByRole("button", { name: "Подтвердить" });
        this.confirmSuccess = page.getByRole("dialog").getByRole("status");
        this.confirmError = page.getByRole("dialog").getByRole("alert");
    }

    async waitForSlots() {
        await expect(async () => {
            const dayChip = this.calendarDay.first();
            if (!(await dayChip.isVisible().catch(() => false))) {
                await this.page.reload();
            }
            await expect(dayChip).toBeVisible();
        }).toPass({ timeout: 10_000 });
    }
    
    async pickFirstSlot() {
        await this.calendarDay.first().click();
        await this.calendarTime.first().click();
    }

    async confirmBooking() {
        await this.confirmButton.click();
    }
}