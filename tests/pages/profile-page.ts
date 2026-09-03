import { type Locator, type Page } from "@playwright/test";
import { ROUTES } from "../helpers/user";

export class ProfilePage {
  page: Page;
  nameInput: Locator;
  telegramInput: Locator;
  timezoneSelect: Locator;
  bioInput: Locator;
  saveButton: Locator;
  skillInput: Locator;
  skillTypeSelect: Locator;
  addButton: Locator;
  canHelpSkills: Locator;
  skillChips: Locator;

  constructor(page: Page) {
    this.page = page;
    this.nameInput = page.getByLabel("Имя");
    this.telegramInput = page.getByLabel("Telegram");
    this.timezoneSelect = page.getByLabel("Часовой пояс");
    this.bioInput = page.getByLabel("О себе");
    this.saveButton = page.getByRole("button", { name: "Сохранить" });
    this.skillInput = page.locator("#pomidorqa-profile-skill-input");
    this.skillTypeSelect = page.locator("#pomidorqa-profile-skill-type");
    this.addButton = page.getByRole("button", { name: "Добавить" });
    this.canHelpSkills = page.getByTestId("can-help-skills");
    this.skillChips = page.locator("[data-skill-tag]");
  }

  async goto() {
    await this.page.goto(ROUTES.profile);
  }

  // Шаг 3. Действия по смыслу кейса (не клики)
  async saveName(name: string) {
    await this.nameInput.fill(name);
    await this.saveButton.click();
  }

  async saveTelegram(telegram: string) {
    await this.telegramInput.fill(telegram);
    await this.saveButton.click();
  }

  async saveTimezone(timezone: string) {
    await this.timezoneSelect.selectOption(timezone);
    await this.saveButton.click();
  }

  async saveBio(bio: string) {
    await this.bioInput.fill(bio);
    await this.saveButton.click();
  }

  async addSkill(skillName: string, type: string = "can_help") {
    await this.skillInput.fill(skillName);
    await this.skillTypeSelect.selectOption(type);
    await this.addButton.click();
  }

  async removeSkill(skillName: string) {
    await this.page
      .locator('[data-skills="can_help"] div, [data-skill-tag]') 
      .filter({ hasText: skillName })
      .locator('button, [role="button"], svg')
      .first()
      .click();
  }

  async saveProfile(page: Page) {
    const saved = page.waitForResponse(
      (response) => response.url().endsWith(ROUTES.profile) && response.request().method() === "POST"
    );
    await this.saveButton.click();
    await saved;
  }
  
}

