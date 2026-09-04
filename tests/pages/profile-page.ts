import { Locator, Page } from "@playwright/test";
import { ROUTES } from "../helpers/routes";

export class ProfilePage {
  readonly page: Page;

  readonly profileNameInput: Locator;
  readonly profileTelegramInput: Locator;
  readonly profileTimezoneSelect: Locator;
  readonly profileBioInput: Locator;
  readonly profileSaveButton: Locator;

  readonly skillInput: Locator;
  readonly skillTypeSelect: Locator;
  readonly addSkillButton: Locator;
  readonly canHelpSkills: Locator;
  readonly skillChips: Locator;


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

  async goto() {
    await this.page.goto(ROUTES.profile);
  }

  async reload() {
    await this.page.reload();
  }

  async saveProfile() {
    const saved = this.page.waitForResponse(
      (response) => response.url().endsWith(ROUTES.profile) && response.request().method() === "POST"
    );
    await this.profileSaveButton.click();
    await saved;
  }

  async addSkill(skillTag: string, type: "can_help" | "want_to_learn" = "can_help") {
    await this.skillInput.fill(skillTag);
    await this.skillTypeSelect.selectOption(type);
    await this.addSkillButton.click();
  }

  async fillName(newName: string) {
    await this.profileNameInput.fill(newName);
  }

  async fillTelegram(newTelegram: string) {
    await this.profileTelegramInput.fill(newTelegram);
  }

  async fillBio(newBio: string) {
    await this.profileBioInput.fill(newBio);
  }

  async changeTimezone(newTimezone: string) {
    await this.profileTimezoneSelect.selectOption(newTimezone);
  }
}
