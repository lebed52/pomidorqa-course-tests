import { type Locator, type Page } from "@playwright/test";
import { ROUTES } from "../helpers/user";

export class ProfilePage {
    page: Page;
    // Профиль: верхняя форма, все поля сохраняются одной кнопкой
    nameInput: Locator;
    telegramInput: Locator;
    timezoneSelect: Locator;
    bioInput: Locator;
    saveButton: Locator;
    // Профиль: нижняя форма «Навыки», у неё своя кнопка
    skillInput: Locator;
    skillTypeSelect: Locator;
    addSkillButton: Locator;
    canHelpSkills: Locator;
    skillChips: Locator;


constructor(page: Page) {
    this.page = page;
    // Профиль: верхняя форма, все поля сохраняются одной кнопкой
    this.nameInput = page.getByLabel("Имя");
    this.telegramInput = page.getByLabel("Telegram");
    this.timezoneSelect = page.getByLabel("Часовой пояс");
    this.bioInput = page.getByLabel("О себе");
    this.saveButton = page.getByRole("button", { name: "Сохранить" });
    // Профиль: нижняя форма «Навыки», у неё своя кнопка
    this.skillInput = page.locator("#pomidorqa-profile-skill-input");
    this.skillTypeSelect = page.locator("#pomidorqa-profile-skill-type");
    this.addSkillButton = page.getByRole("button", { name: "Добавить" });
    this.canHelpSkills = page.getByTestId("can-help-skills");
    this.skillChips = page.locator("[data-skill-tag]");

}

skillChip(tag: string) {
    return this.page.locator(`[data-skill-tag="${tag}"]`);
}

// Сохранение профиля уходит POST-ом на адрес самой страницы, а признака успеха
// в интерфейсе нет: кнопка не меняется, сообщения не появляется. Поэтому ждём
// ответ сервера. Промис создаём до клика — иначе ответ придёт раньше, чем мы
// начнём его слушать, и ожидание повиснет.
async save() {
  const saved = this.page.waitForResponse(
    (response) => response.url().endsWith(ROUTES.profile) && response.request().method() === "POST"
  );
  await this.saveButton.click();
  await saved;
}

async addCanHelpSkill (skillTag: string) {
    await this.skillInput.fill(skillTag);
    await this.skillTypeSelect.selectOption("can_help");
    await this.addSkillButton.click();
  };

}