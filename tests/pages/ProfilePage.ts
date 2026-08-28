import {Locator, Page} from "@playwright/test";
import {ROUTES} from "../helpers/user";

export class ProfilePage {
    readonly page: Page;

    constructor(page: Page) {
        this.page = page;
    }

    get profileNameInput(): Locator {
        return this.page.getByLabel("Имя");
    }

    get profileTelegramInput(): Locator {
        return this.page.getByLabel("Telegram");
    }

    get profileTimezoneSelect(): Locator {
        return this.page.getByLabel("Часовой пояс");
    }

    get profileBioInput(): Locator {
        return this.page.getByLabel("О себе");
    }

    get profileSaveButton(): Locator {
        return this.page.getByRole("button", { name: "Сохранить" });
    }

    get skillInput(): Locator {
        return this.page.locator("#pomidorqa-profile-skill-input");
    }

    get skillTypeSelect(): Locator {
        return this.page.locator("#pomidorqa-profile-skill-type");
    }

    get addSkillButton(): Locator {
        return this.page.getByRole("button", { name: "Добавить" });
    }

    get canHelpSkills(): Locator {
        return this.page.getByTestId("can-help-skills");
    }

    get skillChips(): Locator {
        return this.page.locator("[data-skill-tag]");
    }

    getSkillChip(tag: string): Locator {
        return this.page.locator(`[data-skill-tag="${tag}"]`);
    }

    async saveProfile(page: Page) {
        const saved = page.waitForResponse(
            (response) => response.url().endsWith(ROUTES.profile) && response.request().method() === "POST"
        );
        await this.profileSaveButton.click();
        await saved;
    }
}
