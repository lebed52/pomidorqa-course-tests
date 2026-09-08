import { type Locator, type Page } from "@playwright/test";

const ROUTES = {
    profile: "/pomidorqa/profile",
};

export class ProfilePage {
    readonly page: Page;

    readonly profileNameInput: Locator;
    readonly profileTelegramInput: Locator;
    readonly profileTimezoneSelect: Locator;
    readonly profileBioInput: Locator;
    readonly profileSaveButton: Locator;

    readonly skillInput: Locator;
    readonly skillTypeSelect: Locator;
    readonly addSkillButton: Locator;
    readonly canHelpSkills: Locator;
    readonly skillChips: Locator;

    constructor(page: Page) {
        this.page = page;

        this.profileNameInput = page.getByLabel("Имя");
        this.profileTelegramInput = page.getByLabel("Telegram");
        this.profileTimezoneSelect = page.getByLabel("Часовой пояс");
        this.profileBioInput = page.getByLabel("О себе");
        this.profileSaveButton = page.getByRole("button", { name: "Сохранить" });

        this.skillInput = page.locator("#pomidorqa-profile-skill-input");
        this.skillTypeSelect = page.locator("#pomidorqa-profile-skill-type");
        this.addSkillButton = page.getByRole("button", { name: "Добавить" });
        this.canHelpSkills = page.getByTestId("can-help-skills");
        this.skillChips = page.locator("[data-skill-tag]");
    }

    async open() {
        await this.page.goto(ROUTES.profile);
    }

    skillChip(tag: string) {
        return this.page.locator(`[data-skill-tag="${tag}"]`);
    }

    async saveProfile() {
        const saved = this.page.waitForResponse(
            (response) =>
                response.url().endsWith(ROUTES.profile) &&
                response.request().method() === "POST"
        );

        await this.profileSaveButton.click();
        await saved;
    }

    async fillName(name: string) {
        await this.profileNameInput.fill(name);
    }

    async fillTelegram(telegram: string) {
        await this.profileTelegramInput.fill(telegram);
    }

    async selectTimezone(timezone: string) {
        await this.profileTimezoneSelect.selectOption(timezone);
    }

    async fillBio(bio: string) {
        await this.profileBioInput.fill(bio);
    }

    async addCanHelpSkill(skillTag: string) {
        await this.skillInput.fill(skillTag);
        await this.skillTypeSelect.selectOption("can_help");
        await this.addSkillButton.click();
    }

    async addWantToLearnSkill(skillTag: string) {
        await this.skillInput.fill(skillTag);
        await this.skillTypeSelect.selectOption("want_to_learn");
        await this.addSkillButton.click();
    }

    async clickAddSkill() {
        await this.addSkillButton.click();
    }
}