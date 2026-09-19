import { type Locator, type Page } from "@playwright/test";

export type SkillType = "can_help" | "want_to_learn";

// Экран профиля: /pomidorqa/profile.
// Две независимые формы на одной странице: личные данные (одна кнопка «Сохранить»
// на все поля) и навыки (своя кнопка «Добавить»).
export class ProfilePage {
  readonly page: Page;

  readonly nameInput: Locator;
  readonly telegramInput: Locator;
  readonly timezoneSelect: Locator;
  readonly bioInput: Locator;
  readonly saveButton: Locator;

  readonly skillInput: Locator;
  readonly skillTypeSelect: Locator;
  readonly addSkillButton: Locator;
  readonly canHelpSkills: Locator;
  readonly skillChips: Locator;

  constructor(page: Page) {
    this.page = page;

    this.nameInput = page.getByLabel("Имя");
    this.telegramInput = page.getByLabel("Telegram");
    this.timezoneSelect = page.getByLabel("Часовой пояс");
    this.bioInput = page.getByLabel("О себе");
    this.saveButton = page.getByRole("button", { name: "Сохранить" });

    this.skillInput = page.locator("#pomidorqa-profile-skill-input");
    this.skillTypeSelect = page.locator("#pomidorqa-profile-skill-type");
    this.addSkillButton = page.getByRole("button", { name: "Добавить" });
    this.canHelpSkills = page.getByTestId("can-help-skills");
    this.skillChips = page.locator("[data-skill-tag]");
  }

  skillChip(tag: string): Locator {
    return this.page.locator(`[data-skill-tag="${tag}"]`);
  }

  // Навыки одного типа лежат в своём блоке — так проверяется не только наличие
  // навыка в профиле, но и то, что он попал в нужный раздел.
  skillsSection(type: SkillType): Locator {
    return this.page.locator(`[data-skills="${type}"]`);
  }

  skillRemoveButton(tag: string): Locator {
    return this.page.getByRole("button", { name: `Убрать ${tag}` });
  }

  async goto() {
    await this.page.goto("/pomidorqa/profile");
  }

  async fillName(name: string) {
    await this.nameInput.fill(name);
  }

  async fillTelegram(telegram: string) {
    await this.telegramInput.fill(telegram);
  }

  async selectTimezone(timezone: string) {
    await this.timezoneSelect.selectOption(timezone);
  }

  async fillBio(bio: string) {
    await this.bioInput.fill(bio);
  }

  /**
   * Сохранение личных данных уходит POST-ом на адрес самой страницы, а признака
   * успеха в интерфейсе нет: кнопка не меняется, сообщение не появляется. Поэтому
   * ждём ответ сервера — промис создаём до клика, иначе ответ придёт раньше, чем
   * мы начнём его слушать, и ожидание повиснет.
   */
  async save() {
    const saved = this.page.waitForResponse(
      (response) => response.url().endsWith("/pomidorqa/profile") && response.request().method() === "POST"
    );
    await this.saveButton.click();
    await saved;
  }

  async addSkill(tag: string, type: SkillType) {
    await this.skillInput.fill(tag);
    await this.skillTypeSelect.selectOption(type);
    const added = this.page.waitForResponse(
      (response) => response.url().endsWith("/pomidorqa/profile") && response.request().method() === "POST"
    );
    await this.addSkillButton.click();
    await added;
    await this.skillChip(tag).waitFor({ state: "visible" });
  }

  /**
   * Повторная отправка того же навыка. В отличие от addSkill не ждёт появления чипа:
   * по требованиям (п.6) второй такой же навык добавляться не должен, и тест сам
   * решает, что считать правильным результатом.
   */
  async submitSkill(tag: string, type: SkillType) {
    await this.skillInput.fill(tag);
    await this.skillTypeSelect.selectOption(type);
    const submitted = this.page.waitForResponse(
      (response) => response.url().endsWith("/pomidorqa/profile") && response.request().method() === "POST"
    );
    await this.addSkillButton.click();
    await submitted;
  }

  async removeSkill(tag: string) {
    const removed = this.page.waitForResponse(
      (response) => response.url().endsWith("/pomidorqa/profile") && response.request().method() === "POST"
    );
    await this.skillRemoveButton(tag).click();
    await removed;
    await this.skillChip(tag).waitFor({ state: "hidden" });
  }
}
