import { Locator, Page } from "@playwright/test";
import { ROUTES } from "../helpers/user";

export class CatalogPage {
  readonly page: Page;
  readonly filterInput: Locator;
  readonly filterSubmitButton: Locator;
  readonly personCard: Locator;

  constructor(page: Page) {
    this.page = page;
    this.filterInput = page.locator("#pomidorqa-catalog-skill-filter");
    this.filterSubmitButton = page.getByRole("button", { name: "Найти" });
    this.personCard = page.getByTestId("person-card");
  }

  async gotoCatalog() {
    await this.page.goto(ROUTES.catalog);
  }

  async searchBySkill(skill: string) {
    await this.filterInput.fill(skill);
    await this.filterSubmitButton.click();
  }

  getCardByName(name: string): Locator {
    return this.personCard.filter({ hasText: name });
  }
}
