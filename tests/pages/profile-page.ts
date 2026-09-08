import { Locator, type Page } from "@playwright/test";
import { ROUTES } from "../helpers/user";

export class ProfilePage {
    page: Page;

    // Профиль: верхняя форма, все поля сохраняются одной кнопкой
    profileNameInput: Locator;
    profileTelegramInput: Locator;
    profileTimezoneSelect: Locator;
    profileBioInput: Locator;
    profileSaveButton: Locator;

    // Профиль: нижняя форма «Навыки», у неё своя кнопка
    skillInput: Locator;
    skillTypeSelect: Locator;
    addSkillButton: Locator;
    canHelpSkills: Locator;
    skillChips: Locator;
    // skillName: Locator;
  
    constructor( page: Page) {
        this.page = page;
        // Профиль: верхняя форма, все поля сохраняются одной кнопкой
        this.profileNameInput = page.getByLabel("Имя");
        this.profileTelegramInput = page.getByLabel("Telegram");
        this.profileTimezoneSelect = page.getByLabel("Часовой пояс");
        this.profileBioInput = page.getByLabel("О себе");
        this.profileSaveButton = page.getByRole("button", { name: "Сохранить" });

        // Профиль: нижняя форма «Навыки», у неё своя кнопка
        this.skillInput = page.locator("#pomidorqa-profile-skill-input");
        this.skillTypeSelect = page.locator("#pomidorqa-profile-skill-type");
        this.addSkillButton = page.getByRole("button", { name: "Добавить" });
        this.canHelpSkills = page.getByTestId("can-help-skills");
        this.skillChips = page.locator("[data-skill-tag]");
        // this.skillName   = page.locator(`[data-skill-tag]`); 
    }

  async goto() {
    await this.page.goto(ROUTES.profile);
  }

  async saveName(name: string) {
    await this.profileNameInput.fill(name);
    await this.profileSaveButton.click();
  }

  async saveProfile(page: Page) {
  const saved = page.waitForResponse(
    (response) => response.url().endsWith(ROUTES.profile) && response.request().method() === "POST"
  );
  await this.profileSaveButton.click();
  await saved;
}

  getSkillChip(tag: string): Locator {
    return this.page.locator(`[data-skill-tag="${tag}"]`);
  }

  telegramInput() {
    return this.page.getByLabel("Telegram");
  }
  timezoneSelect() {
    return this.page.getByLabel("Часовой пояс");
  }
  bioInput() {
    return this.page.getByLabel("О себе");
  }
  saveButton() {
    return this.page.getByRole("button", { name: "Сохранить" });
  }
}