import { Locator, Page } from "@playwright/test";

export class ProfilePage {
    page: Page;
    nameInput: Locator;
    telegramInput: Locator;
    timezoneSelect: Locator;
    bioInput: Locator;
    saveButton: Locator;
    skillInput: Locator;
    skillTypeSelect: Locator;
    addSkillButton: Locator;
    canHelpSkills: Locator;
    skillChips: Locator;
    private readonly url = "/pomidorqa/profile";

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

    async saveProfile() {
        const saved = this.page.waitForResponse(
          (response) => response.url().endsWith(this.url) && response.request().method() === "POST"
        );
        await this.saveButton.click();
        await saved;
    }

    async goto() {
        await this.page.goto(this.url);
    }

    skillChip(tag: string) {
        return this.page.locator(`[data-skill-tag="${tag}"]`);
    }

    async addSkill(tag: string, type: "can_help" | "want_to_learn") {
        await this.skillInput.fill(tag);
        await this.skillTypeSelect.selectOption(type);
        await this.addSkillButton.click();
    }
}