import { type Page, expect } from "@playwright/test";

export class ProfilePage {
  constructor(private readonly page: Page) {}

  nameInput = () => this.page.getByLabel("Имя");
  telegramInput = () => this.page.getByLabel("Telegram");
  timezoneSelect = () => this.page.getByLabel("Часовой пояс");
  bioInput = () => this.page.getByLabel("О себе");
  saveButton = () => this.page.getByRole("button", { name: "Сохранить" });

  skillInput = () => this.page.locator("#pomidorqa-profile-skill-input");
  skillTypeSelect = () => this.page.locator("#pomidorqa-profile-skill-type");
  addSkillButton = () => this.page.getByRole("button", { name: "Добавить" });
  canHelpSkills = () => this.page.getByTestId("can-help-skills");
  skillChips = () => this.page.locator("[data-skill-tag]");
  skillElement = (tag: string) => this.page.locator(`[data-skill-tag="${tag}"]`);

  async changeNameAndSave(newName: string) {
    await this.nameInput().fill(newName);
    await this.saveProfile();
  }

  async changeTimezoneAndSave(timezone: string) {
    await this.timezoneSelect().selectOption(timezone);
    await this.saveProfile();
  }

  async addTelegramAndSave(telegram: string) {
    await this.telegramInput().fill(telegram);
    await this.saveProfile();
  }

  async addBioAndSave(bio: string) {
    await this.bioInput().fill(bio);
    await this.saveProfile();
  }

  async fillNameTelegramBioAndSave(name: string, telegram: string, bio: string) {
    await this.nameInput().fill(name);
    await this.telegramInput().fill(telegram);
    await this.bioInput().fill(bio);
    await this.saveProfile();
  }

  async addSkill(skill: string, type: "can_help" | "want_to_learn" = "can_help") {
    await this.skillInput().fill(skill);
    await this.skillTypeSelect().selectOption(type);
    await this.addSkillButton().click();
  }

  async clickAddSkillWithoutInput() {
    await this.addSkillButton().click();
  }

  private async saveProfile() {
    const saved = this.page.waitForResponse(
      (response) =>
        response.url().endsWith("/pomidorqa/profile") &&
        response.request().method() === "POST"
    );
    await this.saveButton().click();
    await saved;
  }
}