import { type Page, type Locator } from "@playwright/test";
import { ROUTES } from "../helpers/user";

export type SkillType = "can_help" | "want_to_learn";

export class ProfilePage {
  readonly nameInput: Locator;
  readonly telegramInput: Locator;
  readonly bioInput: Locator;
  readonly timezoneSelect: Locator;
  readonly skillInput: Locator;
  readonly canHelpSkills: Locator;
  readonly wantToLearnSkills: Locator;

  private readonly saveButton: Locator;
  private readonly skillTypeSelect: Locator;
  private readonly addSkillButton: Locator;

  constructor(readonly page: Page) {
    this.nameInput = page.getByLabel("Имя", { exact: true });
    this.telegramInput = page.getByLabel("Telegram");
    this.bioInput = page.getByLabel("О себе");
    this.timezoneSelect = page.getByLabel("Часовой пояс");
    this.skillInput = page.getByLabel("Навык");
    this.canHelpSkills = page.getByTestId("can-help-skills");
    this.wantToLearnSkills = page.locator('[data-skills="want_to_learn"]');

    this.saveButton = page.getByRole("button", { name: "Сохранить" });
    this.skillTypeSelect = page.getByRole("combobox", { name: "Тип" });
    this.addSkillButton = page.getByRole("button", { name: "Добавить" });
  }

  async goto() {
    await this.page.goto(ROUTES.profile);
  }

  async fillProfileForm(name: string, telegram: string, bio: string) {
    await this.nameInput.fill(name);
    await this.telegramInput.fill(telegram);
    await this.bioInput.fill(bio);
  }

  async selectTimezone(timezone: string) {
    await this.timezoneSelect.selectOption(timezone);
  }

  async saveProfile() {
    const responsePromise = this.page.waitForResponse(
      (response) =>
        response.url().includes(ROUTES.profile) &&
        response.request().method() !== "GET",
      { timeout: 15_000 }
    );

    await this.saveButton.click();

    try {
      await responsePromise;
    } catch (err) {
      const reason = err instanceof Error ? err.message : String(err);
      throw new Error(
        `Не дождались ответа сервера на сохранение. URL: ${this.page.url()}. Ошибка: ${reason}`
      );
    }
  }

  async addSkill(name: string, type: SkillType) {
    await this.skillInput.fill(name);
    await this.skillTypeSelect.selectOption(type);
    await this.addSkillButton.click();
  }

  canHelpSkillItem(tag: string): Locator {
    return this.canHelpSkills.getByText(tag);
  }

  skillRemoveButton(skillName: string): Locator {
    return this.page.locator(`[data-skill-tag="${skillName}"]`).getByLabel(/^Убрать/);
  }
}