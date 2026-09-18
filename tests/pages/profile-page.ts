import { type Page } from "@playwright/test";
import { ROUTES } from "../e2e/config/routes";

export class ProfilePage {
  constructor (readonly page: Page) {}

  // Локаторы
  // Профиль: верхняя форма, все поля сохраняются одной кнопкой
  
  get nameInput() {
    return this.page.getByLabel("Имя");
  }
  get telegramInput() {
    return this.page.getByLabel("Telegram");
  }
  get timezoneSelect() {
    return this.page.getByLabel("Часовой пояс");
  }
  get bioInput() {
    return this.page.getByLabel("О себе");
  }
  get saveButton() {
    return this.page.getByRole("button", { name: "Сохранить" });
  }
  
  // Профиль: нижняя форма «Навыки», у неё своя кнопка
  get skillInput() {  
    return this.page.locator("#pomidorqa-profile-skill-input");
  }   
  get skillTypeSelect() {
    return this.page.locator("#pomidorqa-profile-skill-type");
  }  
  get addSkillButton() {
    return this.page.getByRole("button", { name: "Добавить" });
  }  
  get canHelpSkills() {
    return this.page.getByTestId("can-help-skills");
  }  
  get skillChips() {
    return this.page.locator("[data-skill-tag]");
  }  

  // Методы

  async goto() {
    await this.page.goto(ROUTES.profile);
  }  
 
  async saveProfile(page: Page, profilePage: ProfilePage) {
  const saved = page.waitForResponse(
    (response) => response.url().endsWith(ROUTES.profile) && response.request().method() === "POST"
  );
  await profilePage.saveButton.click();
  await saved;
  }

  async saveName(name: string) {
    await this.nameInput.fill(name);
    await this.saveProfile(this.page, this);
  }

  async saveTimezone(timezone: string) {
    await this.timezoneSelect.selectOption(timezone);
    await this.saveProfile(this.page, this);
  }
  async saveTelegram(telegram: string) {
    await this.telegramInput.fill(telegram);
    await this.saveProfile(this.page, this);
  }
  async saveBio(bio: string) { 
    await this.bioInput.fill(bio);
    await this.saveProfile(this.page, this);
  }

  skillChip(tag: string, _type: "can_help" | "want_to_learn") {
    return this.page.locator(`[data-skill-tag="${tag}"]`);
  }

  async addSkill(tag: string, type: "can_help" | "want_to_learn") {
    await this.skillInput.fill(tag);
    await this.skillTypeSelect.selectOption(type);
    await this.addSkillButton.click();
  }
  
}   