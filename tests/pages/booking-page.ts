import { type Locator, type Page } from "@playwright/test";
import { ROUTES } from "../helpers/user";

export class BookingPage {
  private readonly catalogFilterInput: Locator;
  private readonly catalogFilterButton: Locator;

  readonly personCards: Locator;

  constructor(readonly page: Page) {
    this.catalogFilterInput = page.locator("#pomidorqa-catalog-skill-filter");
    this.catalogFilterButton = page.getByRole("button", { name: "Найти" });
    this.personCards = page.getByTestId("person-card");
  }

  async goToCatalog(): Promise<void> {
    await this.page.goto(ROUTES.catalog);
  }

  async searchCatalog(skillTag: string): Promise<void> {
    await this.catalogFilterInput.fill(skillTag);
    await this.catalogFilterButton.click();
  }

  personCard(name: string): Locator {
    return this.personCards.filter({ hasText: name });
  }
}