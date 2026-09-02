import { type Locator, type Page } from "@playwright/test";

// Отдельные локаторы с главной страницы
export function catalogLoc(page: Page) {
  return {
  filterInput: page.getByLabel("Навык"),
  filterSubmit: page.getByRole("button", { name: "Найти" }),
  card: page.getByTestId("person-card")
  }
}

export class BookingPage {
    page: Page;
    upcomingSection: Locator;
       
constructor(page: Page) {
    this.page = page;
    this.upcomingSection = page.getByTestId("upcoming-meetings");
    }

 get cardName() {
        return this.upcomingSection.locator("[data-booking-id]").first().locator("p").first();
    }

 async searchBySkill (skillTag: string)  {
    await catalogLoc(this.page).filterInput.fill(skillTag);
    await catalogLoc(this.page).filterSubmit.click();
    
  };

}
