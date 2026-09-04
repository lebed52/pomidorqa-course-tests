import { Locator, Page } from "@playwright/test"; 
import { ROUTES } from "../helpers/routes";

export class RegisterPage {
  readonly page: Page;
  readonly registerNameInput: Locator;
  readonly registerEmailInput: Locator;
  readonly registerPasswordInput: Locator;
  readonly registerSubmitButton: Locator;

  constructor(page: Page) {
    this.page = page;

    this.registerNameInput = page.getByLabel("Имя");
    this.registerEmailInput = page.getByLabel("Email");
    this.registerPasswordInput = page.getByLabel("Пароль");
    this.registerSubmitButton = page.getByRole("button", { name: "Зарегистрироваться" });
  }

  async goto() {
    await this.page.goto(ROUTES.register);
  }

  async fillName(newName: string) {
    await this.registerNameInput.fill(newName);
  }

  async fillEmail(newEmail: string) {
    await this.registerEmailInput.fill(newEmail);
  }

  async fillPassword(newPassword: string) {
    await this.registerPasswordInput.fill(newPassword);
  }

  async submit() {
    await this.registerSubmitButton.click();
  }
}
