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

  async reload() {
    await this.page.reload();
  }

  async save() {
    const saved = this.page.waitForResponse(
      (response) =>
        response.url().endsWith(ROUTES.profile) &&
        response.request().method() === "POST",
    );
    await this.saveButton.click();
    await saved;
  }

  async addSkill(
    skillName: string,
    type: "can_help" | "want_to_learn" = "can_help",
  ) {
    await this.skillInput.fill(skillName);
    await this.skillTypeSelect.selectOption(type);
    await this.addButton.click();
  }

  skillChip(tag: string) {
    return this.page.locator(`[data-skill-tag="${tag}"]`);
  }
}
