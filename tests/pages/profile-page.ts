import { type Page, expect } from "@playwright/test";

export class ProfilePage {
  constructor(private readonly page: Page) {}

  private profileNameInput = () => this.page.getByLabel("Имя");
  private profileTelegramInput = () => this.page.getByLabel("Telegram");
  private profileTimezoneSelect = () => this.page.getByLabel("Часовой пояс");
  private profileBioInput = () => this.page.getByLabel("О себе");
  private profileSaveButton = () => this.page.getByRole("button", { name: "Сохранить" });

  private skillInput = () => this.page.locator("#pomidorqa-profile-skill-input");
  private skillTypeSelect = () => this.page.locator("#pomidorqa-profile-skill-type");
  private addSkillButton = () => this.page.getByRole("button", { name: "Добавить" });
  private canHelpSkills = () => this.page.getByTestId("can-help-skills");
  private skillChips = () => this.page.locator("[data-skill-tag]");
  private skillChip = (tag: string) => this.page.locator(`[data-skill-tag="${tag}"]`);

  private async saveProfile() {
    const saved = this.page.waitForResponse(
      (response) =>
        response.url().endsWith("/pomidorqa/profile") &&
        response.request().method() === "POST"
    );
    await this.profileSaveButton().click();
    await saved;
  }

  async changeNameAndSave(newName: string) {
    await this.profileNameInput().fill(newName);
    await this.saveProfile();
  }

  async changeTimezoneAndSave(timezone: string) {
    await this.profileTimezoneSelect().selectOption(timezone);
    await this.saveProfile();
  }

  async addTelegramAndSave(telegram: string) {
    await this.profileTelegramInput().fill(telegram);
    await this.saveProfile();
  }

  async addBioAndSave(bio: string) {
    await this.profileBioInput().fill(bio);
    await this.saveProfile();
  }

  async fillNameTelegramBioAndSave(name: string, telegram: string, bio: string) {
    await this.profileNameInput().fill(name);
    await this.profileTelegramInput().fill(telegram);
    await this.profileBioInput().fill(bio);
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

  async reloadAndExpectName(expected: string) {
    await this.page.reload();
    await expect(this.profileNameInput()).toHaveValue(expected);
  }

  async reloadAndExpectTimezone(expected: string) {
    await this.page.reload();
    await expect(this.profileTimezoneSelect()).toHaveValue(expected);
  }

  async reloadAndExpectTelegram(expected: string) {
    await this.page.reload();
    await expect(this.profileTelegramInput()).toHaveValue(expected);
  }

  async reloadAndExpectBio(expected: string) {
    await this.page.reload();
    await expect(this.profileBioInput()).toHaveValue(expected);
  }

  async reloadAndExpectAllFields(name: string, telegram: string, bio: string) {
    await this.page.reload();
    await expect.soft(this.profileNameInput()).toHaveValue(name);
    await expect.soft(this.profileTelegramInput()).toHaveValue(telegram);
    await expect.soft(this.profileBioInput()).toHaveValue(bio);
  }

  async expectSkillListToContain(skill: string) {
    await expect(this.canHelpSkills()).toContainText(skill);
  }

  async expectSkillInCanHelp(skill: string) {
    await expect(this.canHelpSkills()).toContainText(skill);
  }

  async expectSkillNotInCanHelp(skill: string) {
    await expect(this.canHelpSkills()).not.toContainText(skill);
  }

  async expectNoSkills() {
    await expect(this.skillChips()).toHaveCount(0);
    await expect(this.canHelpSkills()).not.toBeVisible();
  }
}