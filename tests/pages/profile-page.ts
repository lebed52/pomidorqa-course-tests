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
    this.nameInput = page.getByLabel("Имя", {
      exact: true,
    });

    this.telegramInput = page.getByLabel("Telegram");
    this.bioInput = page.getByLabel("О себе");
    this.timezoneSelect = page.getByLabel("Часовой пояс");
    this.skillInput = page.getByLabel("Навык");

    this.canHelpSkills = page.getByTestId(
      "can-help-skills",
    );

    this.wantToLearnSkills = page.locator(
      '[data-skills="want_to_learn"]',
    );

    this.saveButton = page.getByRole("button", {
      name: "Сохранить",
    });

    this.skillTypeSelect = page.getByRole("combobox", {
      name: "Тип",
    });

    this.addSkillButton = page.getByRole("button", {
      name: "Добавить",
    });
  }

  async goto(): Promise<void> {
    await this.page.goto(ROUTES.profile);
  }

  async fillProfileForm(
    name: string,
    telegram: string,
    bio: string,
  ): Promise<void> {
    await this.nameInput.fill(name);
    await this.telegramInput.fill(telegram);
    await this.bioInput.fill(bio);
  }

  private async runProfileMutation(
    actionName: string,
    action: () => Promise<void>,
  ): Promise<void> {
    const responsePromise = this.page.waitForResponse(
      (response) =>
        new URL(response.url()).pathname ===
          ROUTES.profile &&
        response.request().method() === "POST",
      {
        timeout: 15_000,
      },
    );

    const [response] = await Promise.all([
      responsePromise,
      action(),
    ]);

    if (response.status() >= 400) {
      throw new Error(
        `${actionName} завершилось с HTTP ` +
          `${response.status()} ${response.statusText()}`,
      );
    }
  }

  async saveTimezone(
    timezone: string,
  ): Promise<void> {
    await this.timezoneSelect.selectOption(timezone);
    await this.saveProfile();
  }

  async saveProfile(): Promise<void> {
    await this.runProfileMutation(
      "Сохранение профиля",
      async () => {
        await this.saveButton.click();
      },
    );
  }

  async addSkill(
    name: string,
    type: SkillType,
  ): Promise<void> {
    await this.skillInput.fill(name);

    await this.skillTypeSelect.selectOption(type);

    await this.runProfileMutation(
      `Добавление навыка "${name}"`,
      async () => {
        await this.addSkillButton.click();
      },
    );

    await this.skillItem(name, type).waitFor({
      state: "visible",
      timeout: 10_000,
    });
  }

  async removeSkill(
    skillName: string,
  ): Promise<void> {
    const skill = this.page.locator(
      `[data-skill-tag="${skillName}"]`,
    );

    const removeButton =
      skill.getByLabel(/^Убрать/);

    await this.runProfileMutation(
      `Удаление навыка "${skillName}"`,
      async () => {
        await removeButton.click();
      },
    );

    await skill.waitFor({
      state: "detached",
      timeout: 10_000,
    });
  }

  skillItem(
    tag: string,
    type: SkillType,
  ): Locator {
    const container =
      type === "can_help"
        ? this.canHelpSkills
        : this.wantToLearnSkills;

    return container.locator(
      `[data-skill-tag="${tag}"]`,
    );
  }

  canHelpSkillItem(tag: string): Locator {
    return this.skillItem(
      tag,
      "can_help",
    );
  }
}