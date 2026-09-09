import { type Locator, type Page } from "@playwright/test";
import { ROUTES } from "../helpers/user";

function tomorrow(): string {
  const date = new Date();
  date.setDate(date.getDate() + 1);

  return date.toISOString().slice(0, 10);
}

export class SlotsPage {
  private readonly dateInput: Locator;
  private readonly timeInput: Locator;
  private readonly addSubmitButton: Locator;
  private readonly slotCards: Locator;

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

  async addSlot(time: string, dateStr?: string): Promise<void> {
    const targetDate = dateStr ?? tomorrow();
    const slotsBefore = await this.slotCards.count();

    await this.dateInput.fill(targetDate);
    await this.timeInput.fill(time);

    const responsePromise = this.page.waitForResponse(
      (response) =>
        new URL(response.url()).pathname === ROUTES.slots &&
        response.request().method() === "POST",
      { timeout: 15_000 },
    );

    const [response] = await Promise.all([
      responsePromise,
      this.addSubmitButton.click(),
    ]);

    if (response.status() >= 400) {
      throw new Error(
        `Создание слота завершилось с HTTP ${response.status()} ${response.statusText()}`,
      );
    }

    await this.slotCards.nth(slotsBefore).waitFor({
      state: "visible",
      timeout: 10_000,
    });
  }
}