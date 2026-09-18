import { type Locator, type Page } from "@playwright/test";

import { ROUTES } from "../helpers/user";

export class ProfilePage{
    page: Page;
    profileNameInput:Locator;
    profileTelegramInput:Locator;
    profileTimezoneSelect:Locator;
    profileBioInput:Locator;
    profileSaveButton:Locator;
    skillInput:Locator;
    skillTypeSelect:Locator;
    addSkillButton:Locator;
    canHelpSkills:Locator;
    skillChips:Locator; 

    constructor(page: Page) {
        this.page = page;
        this.profileNameInput = page.getByLabel("Имя");
        this.profileTelegramInput = page.getByLabel("Telegram");
        this.profileTimezoneSelect = page.getByLabel("Часовой пояс");
        this.profileBioInput = page.getByLabel("О себе");
        this.profileSaveButton = page.getByRole("button", { name: "Сохранить" });
        this.skillInput = page.locator("#pomidorqa-profile-skill-input");
        this.skillTypeSelect = page.locator("#pomidorqa-profile-skill-type");
        this.addSkillButton = page.getByRole("button", { name: "Добавить" });
        this.canHelpSkills = page.getByTestId("can-help-skills");
        this.skillChips = page.locator("[data-skill-tag]");
    }

  skillChip(tag: string): Locator {
    return this.page.locator(`[data-skill-tag="${tag}"]`);
  }

  async goto(): Promise<void> {
    await this.page.goto(ROUTES.profile);
  }

  async saveProfile(): Promise<void> {
    const saved = this.page.waitForResponse(
      (response) =>
        response.url().endsWith(ROUTES.profile) &&
        response.request().method() === "POST",
    );
    await this.profileSaveButton.click();
    await saved;
  }

  async fillProfileName(name: string): Promise<void> {
    await this.profileNameInput.fill(name);
  }

  async fillProfileTelegram(telegram: string): Promise<void> {
    await this.profileTelegramInput.fill(telegram);
  }

  async fillProfileTimezone(timezone: string): Promise<void> {
    await this.profileTimezoneSelect.selectOption(timezone);
  }

  async fillProfileBio(bio: string): Promise<void> {
    await this.profileBioInput.fill(bio);
  }
}

