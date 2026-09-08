import { type Locator, type Page } from "@playwright/test";
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
  readonly slotCards: Locator;

  constructor(readonly page: Page) {
    this.dateInput = page.locator("#pomidorqa-slots-date");
    this.timeInput = page.locator("#pomidorqa-slots-time");

    this.addSubmitButton = page.getByRole("button", {
      name: "Добавить слот",
    });

    this.slotCards = page.locator("[data-slot-id]");
  }

  async goto(): Promise<void> {
    await this.page.goto(ROUTES.slots);
  }

  async addSlot(
    time: string,
    dateStr?: string,
  ): Promise<void> {
    const targetDate = dateStr ?? getTomorrowDate();
    const slotsBefore = await this.slotCards.count();

    await this.dateInput.fill(targetDate);
    await this.timeInput.fill(time);

    const slotCreatedResponse = this.page.waitForResponse(
      (response) =>
        new URL(response.url()).pathname === ROUTES.slots &&
        response.request().method() === "POST",
      { timeout: 15_000 },
    );

    const [response] = await Promise.all([
      slotCreatedResponse,
      this.addSubmitButton.click(),
    ]);

    if (response.status() >= 400) {
      throw new Error(
        `Создание слота ${targetDate} ${time} завершилось с ` +
          `HTTP ${response.status()} ${response.statusText()}`,
      );
    }

    await this.slotCards.nth(slotsBefore).waitFor({
      state: "visible",
      timeout: 10_000,
    });
  }
}