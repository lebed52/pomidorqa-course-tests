import { Locator, Page, expect } from '@playwright/test';

export class BookingPage {
  readonly page: Page;
  readonly catalogFilter: Locator;
  readonly catalogSearch: Locator;
  readonly personCard: Locator;
  readonly personName: Locator;

  readonly calendarDay: Locator;
  readonly calendarTime: Locator;

  readonly confirmDialog: Locator;
  readonly confirmButton: Locator;
  readonly confirmSuccess: Locator;
  readonly confirmError: Locator;

  readonly upcomingSection: Locator;
  readonly bookingCardName: Locator;

  constructor(page: Page) {
    this.page = page;

    // Каталог
    this.catalogFilter = page.locator('#pomidorqa-catalog-skill-filter');
    this.catalogSearch = page.getByRole('button', { name: 'Найти' });
    this.personCard = page.getByTestId('person-card');
    this.personName = page.getByRole('heading', { level: 1 });

    // Календарь
    this.calendarDay = page.getByRole('group', { name: 'Дни со слотами' }).getByRole('button');
    this.calendarTime = page.getByRole('group', { name: 'Время слотов' }).getByRole('button');

    // Бронирование
    this.confirmDialog = page.getByRole('dialog');
    this.confirmButton = page.getByRole('dialog').getByRole('button', { name: 'Подтвердить' });
    this.confirmSuccess = page.getByRole('dialog').getByRole('status');
    this.confirmError = page.getByRole('dialog').getByRole('alert');

    // Мои встречи
    this.upcomingSection = page.getByTestId('upcoming-meetings');
    this.bookingCardName = page.locator('[data-booking-id]').first().locator('p').first();
  }

  // ===== Каталог =====
  async searchBySkill(skillTag: string) {
    await this.catalogFilter.fill(skillTag);
    await this.catalogSearch.click();
  }

  async openHostCard(hostName: string) {
    await this.personCard.filter({ hasText: hostName }).click();
  }

  // ===== Календарь =====
  async waitForCalendar() {
    await expect(async () => {
      const dayChip = this.calendarDay.first();
      if (!(await dayChip.isVisible().catch(() => false))) {
        await this.page.reload();
      }
      await expect(dayChip).toBeVisible();
    }).toPass({ timeout: 10_000 });
  }

  async selectFirstSlot() {
    await this.waitForCalendar();
    await this.calendarDay.first().click();
    await this.calendarTime.first().click();
  }

  // ===== Бронирование =====
  async confirmBooking() {
    await this.confirmButton.click();
    const success = this.confirmSuccess;
    const error = this.confirmError;
    await expect(success.or(error)).toBeVisible({ timeout: 15_000 });
    if (await error.isVisible().catch(() => false)) {
      throw new Error(`Бронирование не удалось: ${await error.textContent()}`);
    }
  }

  async confirmBookingExpectError() {
    await this.confirmButton.click();
    const success = this.confirmSuccess;
    const error = this.confirmError;
    await expect(success.or(error)).toBeVisible({ timeout: 15_000 });
    if (await success.isVisible().catch(() => false)) {
      throw new Error('Слот должен был быть занят, но бронирование прошло успешно');
    }
    await expect(error).toBeVisible();
  }
}
