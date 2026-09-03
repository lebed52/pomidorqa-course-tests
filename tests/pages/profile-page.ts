import { Locator, Page } from "@playwright/test";
import { ROUTES } from "../helpers/user";

export class ProfilePage {
    page: Page;

    profileNameInput: Locator;
    profileTelegramInput: Locator;
    profileTimezoneSelect: Locator;
    profileBioInput: Locator;
    profileSaveButton: Locator;
    profileSkillInput: Locator;
    profileSkillTypeSelect: Locator;
    profileAddSkillButton: Locator;
    profileCanHelpSkills: Locator;
    profileSkillChips: Locator;

    constructor( page: Page ) {
        this.page = page;

        this.profileNameInput = page.getByLabel("Имя");
        this.profileTelegramInput = page.getByLabel("Telegram");
        this.profileTimezoneSelect = page.getByLabel("Часовой пояс");
        this.profileBioInput = page.getByLabel("О себе");
        this.profileSaveButton = page.getByRole("button", { name: "Сохранить" });
        this.profileSkillInput = page.locator("#pomidorqa-profile-skill-input");
        this.profileSkillTypeSelect = page.locator("#pomidorqa-profile-skill-type");
        this.profileAddSkillButton = page.getByRole("button", { name: "Добавить" });
        this.profileCanHelpSkills = page.getByTestId("can-help-skills");
        this.profileSkillChips = page.locator("[data-skill-tag]");
    }

    async saveProfile() {
        const saved = this.page.waitForResponse(
            (response) => response.url().endsWith(ROUTES.profile) && response.request().method() === "POST"
        );
        await this.profileSaveButton.click();
        await saved;
    }

    async addSkill(tag: string, type: "can_help" | "want_to_learn") {
        await this.profileSkillInput.fill(tag);
        await this.profileSkillTypeSelect.selectOption(type);
        await this.profileAddSkillButton.click();
    }
}
