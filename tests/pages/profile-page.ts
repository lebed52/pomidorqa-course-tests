import { type Locator, type Page } from "@playwright/test";
import { ROUTES } from "../helpers/user";

export type SkillType = "can_help" | "want_to_learn";

export class ProfilePage {
  private readonly skillInput: Locator;
  private readonly canHelpSkills: Locator;
  private readonly wantToLearnSkills: Locator;
  private readonly skillTypeSelect: Locator;
  private readonly addSkillButton: Locator;

  constructor(readonly page: Page) {
    this.skillInput = page.getByLabel("Навык");
    this.canHelpSkills = page.getByTestId("can-help-skills");
    this.wantToLearnSkills = page.locator('[data-skills="want_to_learn"]');
    this.skillTypeSelect = page.getByRole("combobox", { name: "Тип" });
    this.addSkillButton = page.getByRole("button", { name: "Добавить" });
  }

  async goto(): Promise<void> {
    await this.page.goto(ROUTES.profile);
  }

  private async mutation(
    actionName: string,
    action: () => Promise<void>,
  ): Promise<void> {
    const responsePromise = this.page.waitForResponse(
      (response) =>
        new URL(response.url()).pathname === ROUTES.profile &&
        response.request().method() === "POST",
      { timeout: 15_000 },
    );

    const [response] = await Promise.all([
      responsePromise,
      action(),
    ]);

    if (response.status() >= 400) {
      throw new Error(
        `${actionName} завершилось с HTTP ${response.status()} ${response.statusText()}`,
      );
    }
  }

  async addSkill(name: string, type: SkillType): Promise<void> {
    await this.skillInput.fill(name);
    await this.skillTypeSelect.selectOption(type);

    await this.mutation(`Добавление навыка "${name}"`, async () => {
      await this.addSkillButton.click();
    });

    await this.skillItem(name, type).waitFor({
      state: "visible",
      timeout: 10_000,
    });
  }

  skillItem(tag: string, type: SkillType): Locator {
    const container =
      type === "can_help"
        ? this.canHelpSkills
        : this.wantToLearnSkills;

    return container.locator(`[data-skill-tag="${tag}"]`);
  }
}