import { type Locator, type Page } from "@playwright/test";

export class BookingPage {
  readonly page: Page;
  readonly slotsDateInput: Locator;
  readonly slotsTimeInput: Locator;
  readonly addSlotButton: Locator;
  readonly slotCard: Locator;
  readonly catalogFilterInput: Locator;
  readonly catalogSearchButton: Locator;
  readonly personCard: Locator;
  readonly personName: Locator;
  readonly bookingCalendarDay: Locator;
  readonly bookingCalendarTime: Locator;
  readonly bookingConfirmDialog: Locator;
  readonly bookingConfirmButton: Locator;
  readonly bookingConfirmSuccess: Locator;
  readonly bookingConfirmError: Locator;

  constructor(page: Page) {
    this.page = page;
    this.slotsDateInput = page.locator("#pomidorqa-slots-date");
    this.slotsTimeInput = page.locator("#pomidorqa-slots-time");
    this.addSlotButton = page.getByRole("button", { name: "Добавить слот" });
    this.slotCard = page.locator("[data-slot-id]");
    this.catalogFilterInput = page.locator("#pomidorqa-catalog-skill-filter");
    this.catalogSearchButton = page.getByRole("button", { name: "Найти" });
    this.personCard = page.getByTestId("person-card");
    this.personName = page.getByRole("heading", { level: 1 });
    this.bookingCalendarDay = page
      .getByRole("group", { name: "Дни со слотами" })
      .getByRole("button");
    this.bookingCalendarTime = page
      .getByRole("group", { name: "Время слотов" })
      .getByRole("button");
    this.bookingConfirmDialog = page.getByRole("dialog");
    this.bookingConfirmButton = page
      .getByRole("dialog")
      .getByRole("button", { name: "Подтвердить" });
    this.bookingConfirmSuccess = page.getByRole("dialog").getByRole("status");
    this.bookingConfirmError = page.getByRole("dialog").getByRole("alert");
  }

  cardByName(name: string) {
    return this.personCard.filter({ hasText: name });
  }

  async gotoSlots() {
    await this.page.goto("/pomidorqa/profile/slots");
  }

  async addTomorrowSlot(time = "12:00") {
    const tomorrow = new Date(Date.now() + 24 * 60 * 60 * 1000);
    const date = tomorrow.toISOString().slice(0, 10);
    await this.slotsDateInput.fill(date);
    await this.slotsTimeInput.fill(time);
    await this.addSlotButton.click();
  }

  async search(skillTag: string) {
    await this.page.goto("/pomidorqa");
    await this.catalogFilterInput.fill(skillTag);
    await this.catalogSearchButton.click();
  }

  async openPerson(name: string) {
    await this.cardByName(name).click();
  }

  async openFirstSlot() {
    const day = this.bookingCalendarDay.first();

    for (let attempt = 0; attempt < 5; attempt++) {
      if (await day.isVisible().catch(() => false)) {
        break;
      }
      await this.page.reload();
    }

    await day.click();
    await this.bookingCalendarTime.first().click();
  }

  async confirm() {
    await this.bookingConfirmButton.click();
  }
}
