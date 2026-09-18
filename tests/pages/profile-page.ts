import {Locator, Page} from "@playwright/test";
import {ROUTES} from "../helpers/user";

export class ProfilePage {
    readonly page: Page;
    readonly profileNameInput: Locator;
    readonly profileTelegramInput: Locator;
    readonly profileTimezoneSelect: Locator;
    readonly profileBioInput : Locator;
    readonly profileSaveButton : Locator;
    readonly skillInput : Locator;
    readonly skillTypeSelect : Locator;
    readonly addSkillButton : Locator;
    readonly canHelpSkills : Locator;
    readonly skillChips : Locator;


    constructor(page: Page) {
        this.page = page;
        this.profileNameInput = page.getByLabel("Имя");
        this.profileTelegramInput = page.getByLabel("Telegram");
        this.profileTimezoneSelect = page.getByLabel("Часовой пояс");
        this.profileBioInput = page.getByLabel("О себе");
        this.profileSaveButton = page.getByRole("button", { name: "Сохранить" });
        this.skillInput = page.getByLabel("Навык");
        this.skillTypeSelect = page.getByRole("combobox", { name: "Тип" });
        this.addSkillButton = page.getByRole("button", { name: "Добавить" });
        this.canHelpSkills = page.getByTestId("can-help-skills");
        this.skillChips = page.locator("[data-skill-tag]");
    }

    getSkillChip(tag: string): Locator {
        return this.page.locator(`[data-skill-tag="${tag}"]`);
    }

    async saveProfile() {
        const saved = this.page.waitForResponse(
            (response) => response.url().endsWith(ROUTES.profile) && response.request().method() === "POST"
        );
        await this.profileSaveButton.click();
        await saved;
    }

    async fillSkillInput(skillTag: string, section: string): Promise<void> {
        await this.skillInput.fill(skillTag);
        await this.skillTypeSelect.selectOption(section)
        await this.addSkillButton.click();
    }

    async fillAllPersonalInputs(name: string, telegram : string, bio : string, ): Promise<void> {
        await this.profileNameInput.fill(name);
        await this.profileTelegramInput.fill(telegram);
        await this.profileBioInput.fill(bio);
    }

    async gotoProfile() {
        await this.page.goto(ROUTES.profile);
    }

    async gotoSlots() {
        await this.page.goto(ROUTES.slots);
    }
}
