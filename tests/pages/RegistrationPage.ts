import {expect, Locator, Page} from "@playwright/test";
import {ROUTES, TestUser} from "../helpers/user";

export class RegistrationPage {
    readonly page: Page;

    constructor(page: Page) {
        this.page = page;
    }

    get registerNameInput(): Locator {
        return this.page.getByLabel("Имя");
    }

    get registerEmailInput(): Locator {
        return this.page.getByLabel("Email");
    }

    get registerPasswordInput(): Locator {
        return this.page.getByLabel("Пароль");
    }

    get registerSubmitButton(): Locator {
        return this.page.getByRole("button", { name: "Зарегистрироваться" });
    }

    async registerUser(page: Page, user: TestUser) {
        await page.goto(ROUTES.register);
        await this.registerNameInput.fill(user.name);
        await this.registerEmailInput.fill(user.email);
        await this.registerPasswordInput.fill(user.password);
        await this.registerSubmitButton.click();
    }
}