import { type Locator, type Page } from "@playwright/test";

// Экран входа: /pomidorqa/auth/login.
export class LoginPage {
  readonly page: Page;

  readonly emailInput: Locator;
  readonly passwordInput: Locator;
  readonly submitButton: Locator;
  // Один и тот же текст ошибки для неверного пароля и для несуществующего email —
  // из соображений безопасности (requirements.md, п.4).
  readonly errorMessage: Locator;

  constructor(page: Page) {
    this.page = page;

    this.emailInput = page.getByLabel("Email");
    this.passwordInput = page.getByLabel("Пароль");
    this.submitButton = page.getByRole("button", { name: "Войти" });
    this.errorMessage = page.getByText(/Неверный/);
  }

  async goto() {
    await this.page.goto("/pomidorqa/auth/login");
  }

  async login(email: string, password: string) {
    await this.emailInput.fill(email);
    await this.passwordInput.fill(password);
    await this.submitButton.click();
  }
}
