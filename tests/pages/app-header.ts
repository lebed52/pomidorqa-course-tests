import { type Locator, type Page } from "@playwright/test";

export class AppHeader {
  readonly page: Page;
  readonly logoutButton: Locator;

  constructor(page: Page) {
    this.page = page;
    this.logoutButton = page.getByRole("button", { name: "Выйти" });
  }

  async logout() {
    const pageUrl = this.page.url();
    const loggedOut = this.page.waitForResponse(
      (response) => response.url() === pageUrl && response.request().method() === "POST"
    );
    await this.logoutButton.click();
    await loggedOut;
    await this.page.waitForURL(/\/pomidorqa\/?$/);
  }
}
