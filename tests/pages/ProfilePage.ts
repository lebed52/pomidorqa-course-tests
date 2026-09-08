import { Page, expect } from '@playwright/test';

export class ProfilePage {
  constructor(private page: Page) {}

  // ===== Локаторы: основная форма =====
  private nameInput = () => this.page.getByLabel('Имя');
  private telegramInput = () => this.page.getByLabel('Telegram');
  private timezoneSelect = () => this.page.getByLabel('Часовой пояс');
  private bioInput = () => this.page.getByLabel('О себе');
  private saveButton = () => this.page.getByRole('button', { name: 'Сохранить' });

  // ===== Локаторы: навыки =====
  private skillInput = () => this.page.locator('#pomidorqa-profile-skill-input');
  private skillTypeSelect = () => this.page.locator('#pomidorqa-profile-skill-type');
  private addSkillButton = () => this.page.getByRole('button', { name: 'Добавить' });
  private canHelpSkills = () => this.page.getByTestId('can-help-skills');
  private skillChip = (tag: string) => this.page.locator(`[data-skill-tag="${tag}"]`);

  // ===== Локаторы: слоты =====
  private slotsDate = () => this.page.locator('#pomidorqa-slots-date');
  private slotsTime = () => this.page.locator('#pomidorqa-slots-time');
  private addSlotButton = () => this.page.getByRole('button', { name: 'Добавить слот' });
  private slotCard = () => this.page.locator('[data-slot-id]');

  // ===== Действия (Act): профиль =====
  async changeName(name: string) {
    await this.nameInput().fill(name);
    await this.saveProfile();
  }

  async changeTelegram(telegram: string) {
    await this.telegramInput().fill(telegram);
    await this.saveProfile();
  }

  async changeTimezone(timezone: string) {
    await this.timezoneSelect().selectOption(timezone);
    await this.saveProfile();
  }

  async changeBio(bio: string) {
    await this.bioInput().fill(bio);
    await this.saveProfile();
  }

  async saveProfile() {
    const saved = this.page.waitForResponse(
      (res) => res.url().includes('/pomidorqa/profile') && res.request().method() === 'POST',
    );
    await this.saveButton().click();
    await saved;
  }

  // ===== Действия (Act): навыки =====
  async addSkill(tag: string, type: 'can_help' | 'want_to_learn') {
    await this.skillInput().fill(tag);
    await this.skillTypeSelect().selectOption(type);
    await this.addSkillButton().click();
  }

  async removeSkill(tag: string) {
    await this.page.locator(`span[data-skill-tag="${tag}"] button[type="submit"]`).click();
  }

  // ===== Действия (Act): слоты =====
  async addSlot(date: string, time: string) {
    await this.slotsDate().fill(date);
    await this.slotsTime().fill(time);
    await this.addSlotButton().click();
  }

  async goToSlots() {
    await this.page.goto('/pomidorqa/profile/slots');
  }

  // ===== Проверки (Assert): профиль =====
  async expectName(value: string) {
    await expect(this.nameInput()).toHaveValue(value);
  }

  async expectTelegram(value: string) {
    await expect(this.telegramInput()).toHaveValue(value);
  }

  async expectTimezone(value: string) {
    await expect(this.timezoneSelect()).toHaveValue(value);
  }

  async expectBio(value: string) {
    await expect(this.bioInput()).toHaveValue(value);
  }

  // ===== Проверки (Assert): навыки =====
  async expectSkillVisible(tag: string) {
    await expect(this.skillChip(tag)).toBeVisible();
  }

  async expectSkillHidden(tag: string) {
    await expect(this.skillChip(tag)).not.toBeVisible();
  }

  async expectCanHelpContains(tag: string) {
    await expect(this.canHelpSkills()).toContainText(tag);
  }

  async expectCanHelpNotContains(tag: string) {
    await expect(this.canHelpSkills()).not.toContainText(tag);
  }

  async expectNoSkills() {
    await expect(this.page.locator('[data-skill-tag]')).toHaveCount(0);
  }

  // ===== Проверки (Assert): слоты =====
  async expectSlotVisible() {
    await expect(this.slotCard().first()).toBeVisible();
  }

  // ===== Навигация =====
  async goto() {
    await this.page.goto('/pomidorqa/profile');
  }

  async reload() {
    await this.page.reload();
  }
}
