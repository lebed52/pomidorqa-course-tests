import { Locator, Page } from '@playwright/test';

export class ProfilePage {
  readonly page: Page;
  readonly nameInput: Locator;
  readonly telegramInput: Locator;
  readonly timezoneSelect: Locator;
  readonly bioInput: Locator;
  readonly saveButton: Locator;

  readonly skillInput: Locator;
  readonly skillTypeSelect: Locator;
  readonly addSkillButton: Locator;
  readonly canHelpSkills: Locator;
  readonly skillTag = (tag: string) => this.page.locator(`[data-skill-tag="${tag}"]`);

  readonly slotsDate: Locator;
  readonly slotsTime: Locator;
  readonly addSlotButton: Locator;
  readonly slotCard: Locator;

  constructor(page: Page) {
    this.page = page;

    // Поля профиля
    this.nameInput = page.getByLabel('Имя');
    this.telegramInput = page.getByLabel('Telegram');
    this.timezoneSelect = page.getByLabel('Часовой пояс');
    this.bioInput = page.getByLabel('О себе');
    this.saveButton = page.getByRole('button', { name: 'Сохранить' });

    // Навыки
    this.skillInput = page.locator('#pomidorqa-profile-skill-input');
    this.skillTypeSelect = page.locator('#pomidorqa-profile-skill-type');
    this.addSkillButton = page.getByRole('button', { name: 'Добавить' });
    this.canHelpSkills = page.getByTestId('can-help-skills');

    // Слоты
    this.slotsDate = page.locator('#pomidorqa-slots-date');
    this.slotsTime = page.locator('#pomidorqa-slots-time');
    this.addSlotButton = page.getByRole('button', { name: 'Добавить слот' });
    this.slotCard = page.locator('[data-slot-id]');
  }

  // ===== Действия: профиль =====
  async changeName(name: string) {
    await this.nameInput.fill(name);
    await this.saveProfile();
  }

  async changeTelegram(telegram: string) {
    await this.telegramInput.fill(telegram);
    await this.saveProfile();
  }

  async changeTimezone(timezone: string) {
    await this.timezoneSelect.selectOption(timezone);
    await this.saveProfile();
  }

  async changeBio(bio: string) {
    await this.bioInput.fill(bio);
    await this.saveProfile();
  }

  async saveProfile() {
    const saved = this.page.waitForResponse(
      (res) => res.url().includes('/pomidorqa/profile') && res.request().method() === 'POST',
    );
    await this.saveButton.click();
    await saved;
  }

  // ===== Действия: навыки =====
  async addSkill(tag: string, type: 'can_help' | 'want_to_learn') {
    await this.skillInput.fill(tag);
    await this.skillTypeSelect.selectOption(type);
    await this.addSkillButton.click();
  }

  async removeSkill(tag: string) {
    await this.page.locator(`span[data-skill-tag="${tag}"] button[type="submit"]`).click();
  }

  // ===== Действия: слоты =====
  async addSlot(date: string, time: string) {
    await this.slotsDate.fill(date);
    await this.slotsTime.fill(time);
    await this.addSlotButton.click();
  }

  async goToSlots() {
    await this.page.goto('/pomidorqa/profile/slots');
  }

  // ===== Навигация =====
  async goto() {
    await this.page.goto('/pomidorqa/profile');
  }

  async reload() {
    await this.page.reload();
  }
}
