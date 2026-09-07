import { type Locator, type Page } from "@playwright/test";

// Отдельные локаторы с главной страницы
export function catalogLoc(page: Page) {
  return {
  filterInput: page.getByLabel("Навык"),
  filterSubmit: page.getByRole("button", { name: "Найти" }),
  card: page.getByTestId("person-card")
  }
}
export function personCardByName(page: Page, name: string) {
  catalogLoc(page).card.filter({ hasText: name }).click();
}

export class BookingPage {
    page: Page;
    upcomingSection: Locator;
    locCancelFirstMeeting: Locator;
    pastAndCancelledSection: Locator;
       
constructor(page: Page) {
    this.page = page;
    this.upcomingSection = page.getByTestId("upcoming-meetings");
    this.locCancelFirstMeeting = page.locator("[data-booking-id]").first().getByRole("button", { name: "Отменить" });
    this.pastAndCancelledSection = page.locator("section").
    filter({ has: page.getByRole("heading", { name: "Прошедшие и отменённые" }) });
    }

 get cardName() {
        return this.upcomingSection.locator("[data-booking-id]").first().locator("p").first();
    }

 get cardNameForCancelled() {
        return this.pastAndCancelledSection.locator("[data-booking-id]").first().locator("p").first();
    }

 async searchBySkill (skillTag: string)  {
    await catalogLoc(this.page).filterInput.fill(skillTag);
    await catalogLoc(this.page).filterSubmit.click();
    
  };

  async cancelFirstMeeting ()  {
    await this.locCancelFirstMeeting.click();
  }; 

}
