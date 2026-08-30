import { type Page, type Locator } from "@playwright/test";
import { ROUTES } from "../helpers/user";

export class BookingPage {
  private readonly slotDateInput: Locator;
  private readonly slotTimeInput: Locator;
  private readonly addSlotButton: Locator;
  readonly firstSlotCard: Locator;

  private readonly catalogFilterInput: Locator;
  private readonly catalogFilterButton: Locator;

  readonly personName: Locator;
  private readonly dayChip: Locator;
  private readonly timeChip: Locator;

  readonly confirmDialog: Locator;
  private readonly confirmButton: Locator;
  readonly confirmSuccess: Locator;
  readonly confirmError: Locator;

  private readonly bookingsSection: Locator;
  readonly firstBookingName: Locator;

  constructor(readonly page: Page) {
    this.slotDateInput = page.locator("#pomidorqa-slots-date");
    this.slotTimeInput = page.locator("#pomidorqa-slots-time");
    this.addSlotButton = page.getByRole("button", { name: "Добавить слот" });
    this.firstSlotCard = page.locator("[data-slot-id]").first();

    this.catalogFilterInput = page.locator("#pomidorqa-catalog-skill-filter");
    this.catalogFilterButton = page.getByRole("button", { name: "Найти" });

    this.personName = page.getByRole("heading", { level: 1 });
    this.dayChip = page.getByRole("group", { name: "Дни со слотами" }).getByRole("button").first();
    this.timeChip = page.getByRole("group", { name: "Время слотов" }).getByRole("button").first();

    this.confirmDialog = page.getByRole("dialog");
    this.confirmButton = this.confirmDialog.getByRole("button", { name: "Подтвердить" });
    this.confirmSuccess = this.confirmDialog.getByRole("status");
    this.confirmError = this.confirmDialog.getByRole("alert");

    this.bookingsSection = page.getByTestId("upcoming-meetings");
    this.firstBookingName = this.bookingsSection.locator("[data-booking-id]").first().locator("p").first();
  }

  async goToSlots() {
    await this.page.goto(ROUTES.slots);
  }

  async addSlot(date: string, time: string) {
    await this.slotDateInput.fill(date);
    await this.slotTimeInput.fill(time);
    await this.addSlotButton.click();
  }

  async searchCatalog(skillTag: string) {
    await this.catalogFilterInput.fill(skillTag);
    await this.catalogFilterButton.click();
  }

  catalogCard(name: string): Locator {
    return this.page.getByTestId("person-card").filter({ hasText: name });
  }

  async openPerson(name: string) {
    await this.catalogCard(name).click();
  }

  /**
   * Ожидает рендеринг слота. Идемпотентен: игнорирует вызов, если модалка уже открыта.
   */
  async pickFirstSlot(retryTimeoutMs = 10_000) {
    if (await this.confirmDialog.isVisible().catch(() => false)) {
      return;
    }

    const deadline = Date.now() + retryTimeoutMs;
    for (;;) {
      try {
        await this.dayChip.waitFor({ state: "visible", timeout: 1_000 });
        break;
      } catch {
        if (Date.now() > deadline) {
          throw new Error(`Слот не появился вовремя. URL: ${this.page.url()}`);
        }
        await this.page.reload();
      }
    }
    
    await this.dayChip.click();
    await this.timeChip.waitFor({ state: "visible", timeout: 5000 });
    await this.timeChip.click();
  }

  async confirmBooking() {
    await this.confirmButton.click();
  }

  /**
   * Дожидается ответа интерфейса на бронирование. 
   * Ответственность за проверку (expect) лежит на самом тесте.
   */
  async waitForBookingResult(timeout = 15_000): Promise<"success" | "error"> {
    await this.confirmSuccess.or(this.confirmError).waitFor({ state: "visible", timeout });
    return (await this.confirmSuccess.isVisible().catch(() => false)) ? "success" : "error";
  }

  async goToBookings() {
    await this.page.goto(ROUTES.bookings);
  }
}