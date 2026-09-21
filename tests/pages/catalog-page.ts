import { Locator, Page } from "@playwright/test";

export class CatalogPage {
    page: Page;
    filterInput: Locator;
    filterSubmit: Locator;
    personCards: Locator;
    
    constructor(page: Page){
        this.page = page;
        this.filterInput = page.locator("#pomidorqa-catalog-skill-filter");
        this.filterSubmit = page.getByRole("button", { name: "Найти" });
        this.personCards = page.getByTestId("person-card");
    }

    async filterBySkill(skillTag: string) {
        await this.filterInput.fill(skillTag);
        await this.filterSubmit.click();
    }

    personCard(name: string) {
        return this.personCards.filter({ hasText: name });
    }

    async openPersonCard(name: string) {
        await this.personCard(name).click();
    }
}