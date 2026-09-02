import { type Page, Locator } from '@playwright/test';

export const ROUTES = {
  register: '/pomidorqa/auth/register',
  profile: '/pomidorqa/profile',
};

export class ProfilePage {
  readonly page: Page;

  // Профиль: верхняя форма
  readonly profileNameInput: Locator;
  readonly profileTelegramInput: Locator;
  readonly profileTimezoneSelect: Locator;
  readonly profileBioInput: Locator;
  readonly profileSaveButton: Locator;

  // Профиль: нижняя форма «Навыки»
  readonly skillInput: Locator;
  readonly skillTypeSelect: Locator;
  readonly addSkillButton: Locator;
  readonly canHelpSkills: Locator;
  readonly skillChips: Locator;

  constructor(page: Page) {
    this.page = page;

    // Инициализация локаторов
    this.profileNameInput = page.getByLabel('Имя');
    this.profileTelegramInput = page.getByLabel('Telegram');
    this.profileTimezoneSelect = page.getByLabel('Часовой пояс');
    this.profileBioInput = page.getByLabel('О себе');
    this.profileSaveButton = page.getByRole('button', { name: 'Сохранить' });

    this.skillInput = page.locator('#pomidorqa-profile-skill-input');
    this.skillTypeSelect = page.locator('#pomidorqa-profile-skill-type');
    this.addSkillButton = page.getByRole('button', { name: 'Добавить' });
    this.canHelpSkills = page.getByTestId('can-help-skills');
    this.skillChips = page.locator('[data-skill-tag]');
  }

  getSkillChip(tag: string): Locator {
    return this.page.locator(`[data-skill-tag="${tag}"]`);
  }

  async goto() {
    await this.page.goto(ROUTES.profile);
  }

  async saveProfile() {
    const saved = this.page.waitForResponse(
      (response) =>
        response.url().endsWith(ROUTES.profile) && response.request().method() === 'POST',
    );
    await this.profileSaveButton.click();
    await saved;
  }
}
