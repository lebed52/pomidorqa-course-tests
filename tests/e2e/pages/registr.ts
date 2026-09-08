import { expect, type Locator, type Page } from '@playwright/test';
import { type TestUser } from '../helpers/user';

export class RegistrPage {
  readonly page: Page;
  readonly inputName: Locator;
  readonly inputEmail: Locator;
  readonly inputPassword: Locator;
  readonly btnReg: Locator;

  constructor(page: Page) {
    this.page = page;
    this.inputName = page.getByLabel('Имя');
    this.inputEmail = page.getByLabel('Email');
    this.inputPassword = page.getByLabel('Пароль');
    this.btnReg = page.getByRole('button', { name: 'Зарегистрироваться' });
  }

  async open() {
    await this.page.goto('/pomidorqa/auth/register');
  }

  async register(user: TestUser) {
    await this.open();
    await this.inputName.fill(user.name);
    await this.inputEmail.fill(user.email);
    await this.inputPassword.fill(user.password);
    await this.btnReg.click();
    await expect(this.page).toHaveURL(/\/pomidorqa\/?$/);
  }
}
