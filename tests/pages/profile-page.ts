import { Locator, Page } from "@playwright/test";
import {ROUTES} from "../helpers/user";

export class ProfilePage {
    page: Page;

    profileNameInput: Locator;
    profileTelegramInput: Locator;
    profileTimezoneSelect : Locator;
    profileBioInput: Locator;
    profileSaveButton: Locator;
    skillInput: Locator;
    skillTypeSelect: Locator;
    addSkillButton: Locator;
    canHelpSkills: Locator;
    skillChips: Locator;
    skillChip: Locator;

    constructor( page: Page) {
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
        this.skillChip = page.locator(`[data-skill-tag]`);
    }

    async saveProfile() {
        const saved = this.page.waitForResponse(
            (response) => response.url().endsWith(ROUTES.profile) && response.request().method() === "POST"
        );
        await this.profileSaveButton.click();
        await saved;
    }

    async saveSkill() {
        const added = this.page.waitForResponse(
            (r) => r.url().includes(ROUTES.profile) && r.request().method() === "POST"
        );
        await this.addSkillButton.click();
        await added;
    }

    async goto() {
        await this.page.goto(ROUTES.profile);
    }

    async selectTimezone(timezone: string) {
        await this.profileTimezoneSelect.selectOption(timezone);
        await this.saveProfile();
    }

    async updateProfile(data: UpdateProfileData) {
        if (data.name !== undefined) {
            await this.profileNameInput.fill(data.name);
        }
        if (data.telegram !== undefined) {
            await this.profileTelegramInput.fill(data.telegram);
        }
        if (data.bio !== undefined) {
            await this.profileBioInput.fill(data.bio);
        }

        await this.saveProfile();
    }

    async addSkill(tag: string, type: string) {
        await this.skillInput.fill(tag);
        await this.skillTypeSelect.selectOption(type);
        await this.saveSkill();
    }
}

export type UpdateProfileData = {
    name?: string;
    telegram?: string;
    bio?: string;
};



