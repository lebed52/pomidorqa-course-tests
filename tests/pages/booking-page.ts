import { type Locator, type Page } from "@playwright/test";

export class BookingPage {
  page: Page;
  slotsDateInput: Locator;
  slotsTimeInput: Locator;
  addSlotButton: Locator;
  slotCard: Locator;
  catalogFilterInput: Locator;
  catalogSearchButton: Locator;
  personCard: Locator;
  personName: Locator;
  bookingConfirmDialog: Locator;
  bookingConfirmButton: Locator;
  bookingConfirmSuccess: Locator;
  bookingConfirmError: Locator;
  upcomingHeading: Locator;
  pastHeading: Locator;
  upcomingEmpty: Locator;
  cancelledStatus: Locator;
  bookingCancelButton: Locator;
  catalogEmpty: Locator;

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
    this.bookingConfirmDialog = page.getByRole("dialog");
    this.bookingConfirmButton = page
      .getByRole("dialog")
      .getByRole("button", { name: "Подтвердить" });
    this.bookingConfirmSuccess = page.getByRole("dialog").getByRole("status");
    this.bookingConfirmError = page.getByRole("dialog").getByRole("alert");
    this.upcomingHeading = page.getByRole("heading", { name: "Ближайшие" });
    this.pastHeading = page.getByRole("heading", {
      name: "Прошедшие и отменённые",
    });
    this.upcomingEmpty = page
      .getByTestId("upcoming-meetings")
      .getByText("Пока пусто");
    this.cancelledStatus = page.getByText(/отменено/i);
    this.bookingCancelButton = page.getByRole("button", { name: "Отменить" });
    this.catalogEmpty = page.getByText("Пока никого не нашли по этому фильтру");
  }

  meetingByName(name: string) {
    return this.page.getByText(name, { exact: true });
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
    return { date, time };
  }

  async search(skillTag: string) {
    await this.page.goto("/pomidorqa");
    await this.catalogFilterInput.fill(skillTag);
    await this.catalogSearchButton.click();
  }

  async openPerson(name: string) {
    await this.cardByName(name).click();
  }

  slotById(slotId: string) {
    return this.page
      .getByRole("group", { name: "Время слотов" })
      .locator(`[data-slot-id="${slotId}"]`);
  }

  slotDay(date: string) {
    return this.page.locator(`[data-date="${date}"]`);
  }

  slotTime(time?: string) {
    const group = this.page.getByRole("group", { name: "Время слотов" });
    return time
      ? group.getByRole("button", { name: time, exact: true })
      : group.getByRole("button");
  }

  async openSlot(date: string, slotId: string) {
    const day = this.slotDay(date);
    const slot = this.slotById(slotId);
    await slot.waitFor({ state: "visible" });
    await this.page.waitForFunction((id) => {
      const button = document.querySelector(
        `[aria-label="Время слотов"] [data-slot-id="${id}"]`,
      );
      return Boolean(
        button && Object.keys(button).some((key) => key.startsWith("__react")),
      );
    }, slotId);
    if ((await day.getAttribute("aria-pressed")) !== "true") {
      await day.click();
    }
    await slot.click();
  }

  async confirm() {
    await this.bookingConfirmButton.click();
  }

  async gotoBookings() {
    await this.page.goto("/pomidorqa/bookings");
  }

  async cancelBooking() {
    await this.gotoBookings();
    await this.bookingCancelButton.click();
  }
}


