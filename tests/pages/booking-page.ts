import type { Page, Locator } from "@playwright/test";

const SLOTS_ROUTE = "/pomidorqa/profile/slots";
const BOOKINGS_ROUTE = "/pomidorqa/bookings";

export class BookingPage {
  readonly page: Page;

  constructor(page: Page) {
    this.page = page;
  }

  // Мои слоты
  get slotsDateInput(): Locator {
    return this.page.locator("#pomidorqa-slots-date");
  }

  get slotsTimeInput(): Locator {
    return this.page.locator("#pomidorqa-slots-time");
  }

  get slotsAddButton(): Locator {
    return this.page.getByRole("button", { name: "Добавить слот" });
  }

  get slotCards(): Locator {
    return this.page.locator("[data-slot-id]");
  }

  // Каталог (на главной /pomidorqa)
  get catalogFilterInput(): Locator {
    return this.page.locator("#pomidorqa-catalog-skill-filter");
  }

  get catalogFilterButton(): Locator {
    return this.page.getByRole("button", { name: "Найти" });
  }

  get catalogCards(): Locator {
    return this.page.getByTestId("person-card");
  }

  catalogCardByName(name: string): Locator {
    return this.catalogCards.filter({ hasText: name });
  }

  // Карточка человека
  get personName(): Locator {
    return this.page.getByRole("heading", { level: 1 });
  }

  // Календарь слотов
  get calendarDays(): Locator {
    return this.page.getByRole("group", { name: "Дни со слотами" }).getByRole("button");
  }

  get calendarTimes(): Locator {
    return this.page.getByRole("group", { name: "Время слотов" }).getByRole("button");
  }

  // Модалка подтверждения бронирования
  get confirmDialog(): Locator {
    return this.page.getByRole("dialog");
  }

  get confirmButton(): Locator {
    return this.confirmDialog.getByRole("button", { name: "Подтвердить" });
  }

  get confirmSuccess(): Locator {
    return this.confirmDialog.getByRole("status");
  }

  get confirmError(): Locator {
    return this.confirmDialog.getByRole("alert");
  }

  // Мои встречи
  get upcomingSection(): Locator {
    return this.page.getByTestId("upcoming-meetings");
  }

  get upcomingCardName(): Locator {
    return this.upcomingSection.locator("[data-booking-id]").first().locator("p").first();
  }

  // Действия
  async openSlots() {
    await this.page.goto(SLOTS_ROUTE);
  }

  async openBookings() {
    await this.page.goto(BOOKINGS_ROUTE);
  }

  async reload() {
    await this.page.reload();
  }

  async addSlot(date: string, time: string) {
    await this.slotsDateInput.fill(date);
    await this.slotsTimeInput.fill(time);
    await this.slotsAddButton.click();
  }

  async searchInCatalog(skillTag: string) {
    await this.catalogFilterInput.fill(skillTag);
    await this.catalogFilterButton.click();
  }

  async openPersonCard(name: string) {
    await this.catalogCardByName(name).click();
  }

  async pickFirstDayAndTime() {
    await this.calendarDays.first().click();
    await this.calendarTimes.first().click();
  }

  async confirmBooking() {
    await this.confirmButton.click();
  }
}
