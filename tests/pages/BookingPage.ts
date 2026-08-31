import { Page, expect } from '@playwright/test';

export class BookingPage {
  constructor(private page: Page) {}

  // ===== Локаторы =====
  private catalogFilter = () => this.page.locator('#pomidorqa-catalog-skill-filter');
  private catalogSearch = () => this.page.getByRole('button', { name: 'Найти' });
  private personCard = () => this.page.getByTestId('person-card');
  private personName = () => this.page.getByRole('heading', { level: 1 });

  private calendarDay = () =>
    this.page.getByRole('group', { name: 'Дни со слотами' }).getByRole('button');
  private calendarTime = () =>
    this.page.getByRole('group', { name: 'Время слотов' }).getByRole('button');

  private confirmDialog = () => this.page.getByRole('dialog');
  private confirmButton = () =>
    this.page.getByRole('dialog').getByRole('button', { name: 'Подтвердить' });
  private confirmSuccess = () => this.page.getByRole('dialog').getByRole('status');
  private confirmError = () => this.page.getByRole('dialog').getByRole('alert');

  private upcomingSection = () => this.page.getByTestId('upcoming-meetings');
  private bookingCardName = () =>
    this.upcomingSection().locator('[data-booking-id]').first().locator('p').first();

  // ===== Действия (Act): каталог =====
  async searchBySkill(skillTag: string) {
    await this.catalogFilter().fill(skillTag);
    await this.catalogSearch().click();
  }

  async openHostCard(hostName: string) {
    await this.personCard().filter({ hasText: hostName }).click();
  }

  // ===== Действия (Act): календарь =====
  async waitForCalendar() {
    await expect(async () => {
      const dayChip = this.calendarDay().first();
      if (!(await dayChip.isVisible().catch(() => false))) {
        await this.page.reload();
      }
      await expect(dayChip).toBeVisible();
    }).toPass({ timeout: 10_000 });
  }

  async selectFirstSlot() {
    await this.waitForCalendar();
    await this.calendarDay().first().click();
    await this.calendarTime().first().click();
  }

  // ===== Действия (Act): бронирование =====
  async confirmBooking() {
    await this.confirmButton().click();
    const success = this.confirmSuccess();
    const error = this.confirmError();
    await expect(success.or(error)).toBeVisible({ timeout: 15_000 });
    if (await error.isVisible().catch(() => false)) {
      throw new Error(`Бронирование не удалось: ${await error.textContent()}`);
    }
  }

  async confirmBookingExpectError() {
    await this.confirmButton().click();
    const success = this.confirmSuccess();
    const error = this.confirmError();
    await expect(success.or(error)).toBeVisible({ timeout: 15_000 });
    if (await success.isVisible().catch(() => false)) {
      throw new Error('Слот должен был быть занят, но бронирование прошло успешно');
    }
    await expect(error).toBeVisible();
  }

  // ===== Проверки (Assert) =====
  async expectPersonName(name: string) {
    await expect(this.personName()).toHaveText(name);
  }

  async expectDialogVisible() {
    await expect(this.confirmDialog()).toBeVisible();
  }

  async expectBookingCardHasName(name: string) {
    await expect(async () => {
      await this.page.goto('/pomidorqa/bookings');
      const card = this.bookingCardName();
      await expect(card).toHaveText(name);
    }).toPass({ timeout: 10_000 });
  }
}
