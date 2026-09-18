import type { Page, Locator } from "@playwright/test";

const PROFILE_ROUTE = "/pomidorqa/profile";

export class ProfilePage {
  readonly page: Page;

  constructor(page: Page) {
    this.page = page;
  }

  get nameInput(): Locator {
    return this.page.getByLabel("Имя");
  }

  get telegramInput(): Locator {
    return this.page.getByLabel("Telegram");
  }

  get timezoneSelect(): Locator {
    return this.page.getByLabel("Часовой пояс");
  }

  get bioInput(): Locator {
    return this.page.getByLabel("О себе");
  }

  get saveButton(): Locator {
    return this.page.getByRole("button", { name: "Сохранить" });
  }

  
  get skillInput(): Locator {
    return this.page.locator("#pomidorqa-profile-skill-input");
  }

  get skillTypeSelect(): Locator {
    return this.page.locator("#pomidorqa-profile-skill-type");
  }

  get addSkillButton(): Locator {
    return this.page.getByRole("button", { name: "Добавить" });
  }

  get canHelpSkills(): Locator {
    return this.page.getByTestId("can-help-skills");
  }

  get skillChips(): Locator {
    return this.page.locator("[data-skill-tag]");
  }

  skillChip(tag: string): Locator {
    return this.page.locator(`[data-skill-tag="${tag}"]`);
  }

  async open() {
    await this.page.goto(PROFILE_ROUTE);
  }

  async reload() {
    await this.page.reload();
  }

    async save() {
    const saved = this.page.waitForResponse(
      (response) => response.url().endsWith(PROFILE_ROUTE) && response.request().method() === "POST"
    );
    await this.saveButton.click();
    await saved;
  }

  async fillName(name: string) {
    await this.nameInput.fill(name);
  }

  async fillTelegram(telegram: string) {
    await this.telegramInput.fill(telegram);
  }

  async fillBio(bio: string) {
    await this.bioInput.fill(bio);
  }

  async selectTimezone(timezone: string) {
    await this.timezoneSelect.selectOption(timezone);
  }

  async addSkill(skillTag: string, type: "can_help" | "want_to_learn") {
    await this.skillInput.fill(skillTag);
    await this.skillTypeSelect.selectOption(type);
    await this.addSkillButton.click();
  }

  async clickAddSkill() {
    await this.addSkillButton.click();
  }
}
