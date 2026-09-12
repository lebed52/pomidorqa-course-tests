import { type Page } from "@playwright/test";

export class CatalogPage {
  constructor(private readonly page: Page) {}

  skillFilterInput = () =>
    this.page.locator("#pomidorqa-catalog-skill-filter");

  searchButton = () =>
    this.page.getByRole("button", { name: "Найти" });

  personCard = (name: string) =>
    this.page
      .locator('[data-testid="person-card"]')
      .filter({ hasText: name });

  personName = () =>
    this.page.getByRole("heading", { level: 1 });

  async searchBySkill(skill: string) {
    await this.skillFilterInput().fill(skill);
    await this.searchButton().click();
  }

  async openPerson(name: string) {
    await this.personCard(name).click();
  }
}