import { expect, type Locator, type Page } from '@playwright/test';

export class ProfilePage {
  readonly page: Page;
  readonly inputName: Locator;
  readonly inputTelegram: Locator;
  readonly inputAboutMe: Locator;
  readonly timezoneSelect: Locator;
  readonly inputSkill: Locator;
  readonly selectSkillType: Locator;
  readonly btnAddSkill: Locator;
  readonly canHelpSkills: Locator;
  readonly btnSave: Locator;

  constructor(page: Page) {
    this.page = page;
    this.inputName = page.getByLabel('Имя');
    this.inputTelegram = page.locator('[placeholder="@username"]');
    this.inputAboutMe = page.getByLabel('О себе');
    this.timezoneSelect = page.getByLabel('Часовой пояс');
    this.inputSkill = page.locator('#pomidorqa-profile-skill-input');
    this.selectSkillType = page.locator('#pomidorqa-profile-skill-type');
    this.btnAddSkill = page.getByRole('button', { name: 'Добавить' });
    this.canHelpSkills = page.getByTestId('can-help-skills');
    this.btnSave = page.getByRole('button', { name: 'Сохранить' });
  }

  async open() {
    await this.page.goto('/pomidorqa/profile');
  }

  async setName(name: string) {
    await this.inputName.clear();
    await this.inputName.fill(name);
  }

  async save() {
    const saveResponse = this.page.waitForResponse(
      (resp) => resp.url().includes('/pomidorqa') && resp.request().method() !== 'GET',
    );
    await this.btnSave.click();
    await saveResponse;
  }

  async addSkill(tag: string, type: 'can_help' | 'want_to_learn' = 'can_help') {
    await this.inputSkill.fill(tag);
    await this.selectSkillType.selectOption(type);
    await this.btnAddSkill.click();
  }
}
