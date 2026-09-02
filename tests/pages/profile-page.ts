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
  readonly profileAboutInput: Locator;
  readonly profileSaveButton: Locator;

  // Профиль: нижняя форма «Навыки»
  readonly profileSkillInput: Locator;
  readonly profileSkillTypeSelect: Locator;
  readonly profileSkillSubmit: Locator;
  readonly canHelpSkills: Locator;
  readonly skillChips: Locator;
  readonly profileSkillTags: Locator;
  readonly profileSkillDrop: Locator;

  constructor(page: Page) {
    this.page = page;

    // Инициализация локаторов
    this.profileNameInput = page.getByLabel('Имя');
    this.profileTelegramInput = page.getByLabel('Telegram');
    this.profileTimezoneSelect = page.getByLabel('Часовой пояс');
    this.profileAboutInput = page.getByLabel('О себе');
    this.profileSaveButton = page.getByRole('button', { name: 'Сохранить' });

    this.profileSkillInput = page.locator('#pomidorqa-profile-skill-input');
    this.profileSkillTypeSelect = page.locator('#pomidorqa-profile-skill-type');
    this.profileSkillSubmit = page.getByRole('button', { name: 'Добавить' });
    this.canHelpSkills = page.getByTestId('can-help-skills');
    this.skillChips = page.locator('[data-skill-tag]');
    this.profileSkillTags = page.locator('[data-skill-tag]'); // для всех тегов навыков на странице
    this.profileSkillDrop = page.getByRole('button', { name: 'Убрать' });
  }

  // для конкретного тега навыка
  getProfileSkillTagByName(name: string): Locator {
    return this.page.locator(`[data-skill-tag="${name}"]`);
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
