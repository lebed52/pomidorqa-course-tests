import { Locator, Page } from "@playwright/test";
import { ROUTES } from "../helpers/user";

export class ProfilePage {
    page: Page;
    profileNameInput: Locator;
    profileSaveButton: Locator;
    profileTelegramInput: Locator;
    profileTimezoneSelect: Locator;
    profileAboutInput: Locator;
    skillInput: Locator;
    skillTypeSelect: Locator;
    addSkillButton: Locator;
    canHelpSkills: Locator;
  
    constructor(page: Page) {
    this.page = page;
    this.profileNameInput = page.getByLabel("Имя");
    this.profileSaveButton = page.getByRole("button", { name: "Сохранить" });
    this.profileTelegramInput = page.getByLabel("Telegram");
    this.profileTimezoneSelect = page.locator('[name="timezone"]');
    this.profileAboutInput = page.getByLabel("О себе");
    this.skillInput = page.locator("#pomidorqa-profile-skill-input");
    this.skillTypeSelect = page.locator("#pomidorqa-profile-skill-type");
    this.addSkillButton = page.getByRole("button", { name: "Добавить" });
    this.canHelpSkills = page.getByTestId("can-help-skills");
    }

    async save() {
        const saved = this.page.waitForResponse(
          (response) => response.url().endsWith("/pomidorqa/profile") && response.request().method() === "POST"
        );
        await this.profileSaveButton.click();
        await saved;
      }

      async addSkill(skillTag: string, type: string) {
        const added = this.page.waitForResponse(
          (response) =>
            response.url().endsWith(ROUTES.profile) && response.request().method() === "POST"
        );
        await this.skillInput.fill(skillTag);
        await this.skillTypeSelect.selectOption(type);
        await this.addSkillButton.click();
        await added;
    }
    async changeUserName(newName: string) {
      await this.profileNameInput.fill(newName);
      await this.profileSaveButton.click();
      await this.page.waitForResponse(
        (response) => response.url().endsWith(ROUTES.profile) && response.request().method() === "PATCH"
      );
      await this.page.reload();
  }
} 
