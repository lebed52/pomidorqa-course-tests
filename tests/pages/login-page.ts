import { type Page } from "@playwright/test";

export class LoginPage {
  constructor(private readonly page: Page) {}

  emailInput = () => this.page.getByLabel("Email");

  passwordInput = () => this.page.getByLabel("Пароль");

  loginButton = () =>
    this.page.getByRole("button", { name: "Войти" });

  errorMessage = () =>
    this.page.getByText(/Неверный/);

  async login(email: string, password: string) {
    await this.emailInput().fill(email);
    await this.passwordInput().fill(password);
    await this.loginButton().click();
  }

  async getErrorText() {
    return (await this.errorMessage().textContent())?.trim() ?? "";
  }
}