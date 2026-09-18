import { type Locator, type Page } from "@playwright/test";
import { type TestUser } from "../helpers/user";

// Экран регистрации: /pomidorqa/auth/register.
export class RegisterPage {
  readonly page: Page;

  readonly nameInput: Locator;
  readonly emailInput: Locator;
  readonly passwordInput: Locator;
  readonly submitButton: Locator;

  constructor(page: Page) {
    this.page = page;

    this.nameInput = page.getByLabel("Имя");
    this.emailInput = page.getByLabel("Email");
    this.passwordInput = page.getByLabel("Пароль");
    this.submitButton = page.getByRole("button", { name: "Зарегистрироваться" });
  }

  async goto() {
    await this.page.goto("/pomidorqa/auth/register");
  }

  async fillForm(user: TestUser) {
    await this.nameInput.fill(user.name);
    await this.emailInput.fill(user.email);
    await this.passwordInput.fill(user.password);
  }

  async submit() {
    await this.submitButton.click();
  }
}
