import { type Locator, type Page } from "@playwright/test";

export class PersonPage {
  readonly page: Page;
  readonly content: Locator;
  readonly name: Locator;
  readonly canHelpSection: Locator;
  readonly wantToLearnSection: Locator;

  constructor(page: Page) {
    this.page = page;
    this.content = page.locator("main");
    this.name = page.getByRole("heading", { level: 1 });
    this.canHelpSection = page.getByText(/может помочь с/i).locator("..");
    this.wantToLearnSection = page.getByText(/хочет разобрать/i).locator("..");
  }
}
