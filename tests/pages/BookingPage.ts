import { Locator, Page } from '@playwright/test';

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

    this.catalogFilter = page.locator('#pomidorqa-catalog-skill-filter');
    this.catalogSearch = page.getByRole('button', { name: 'Найти' });
    this.personCard = page.getByTestId('person-card');
    this.personName = page.getByRole('heading', { level: 1 });

    this.calendarDay = page.getByRole('group', { name: 'Дни со слотами' }).getByRole('button');
    this.calendarTime = page.getByRole('group', { name: 'Время слотов' }).getByRole('button');

    this.confirmDialog = page.getByRole('dialog');
    this.confirmButton = page.getByRole('dialog').getByRole('button', { name: 'Подтвердить' });
    this.confirmSuccess = page.getByRole('dialog').getByRole('status');
    this.confirmError = page.getByRole('dialog').getByRole('alert');

    this.upcomingSection = page.getByTestId('upcoming-meetings');
    this.bookingCardName = page.locator('[data-booking-id]').first().locator('p').first();
  }

  async searchBySkill(skillTag: string) {
    await this.catalogFilter.fill(skillTag);
    await this.catalogSearch.click();
  }

  async openHostCard(hostName: string) {
    await this.personCard.filter({ hasText: hostName }).click();
  }

  async selectFirstSlot() {
    await this.calendarDay.first().waitFor({ state: 'visible', timeout: 10_000 });
    await this.calendarDay.first().click();
    await this.calendarTime.first().click();
  }

  async clickConfirm() {
    await this.confirmButton.click();
  }

  async goToBookings() {
    await this.page.goto('/pomidorqa/bookings');
  }
}
