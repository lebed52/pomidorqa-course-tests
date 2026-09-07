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
  readonly cancelButton: Locator;
  readonly confirmSuccess: Locator;
  readonly confirmError: Locator;

  readonly upcomingSection: Locator;
  readonly canceledSection: Locator;

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
    this.cancelButton = page.getByRole('button', { name: 'Отменить' });
    this.confirmSuccess = page.getByRole('dialog').getByRole('status');
    this.confirmError = page.getByRole('dialog').getByRole('alert');

    this.upcomingSection = page.getByTestId('upcoming-meetings');
    this.canceledSection = page.locator('section').filter({ hasText: 'Прошедшие и отменённые' });
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

  async bookingCancel() {
    await this.cancelButton.click();
  }

  async goToBookings() {
    await this.page.goto('/pomidorqa/bookings');
  }

  async getFirstUpcomingBookingId(): Promise<string> {
    const id = await this.upcomingSection
      .locator('[data-booking-id]')
      .first()
      .getAttribute('data-booking-id');
    if (!id) throw new Error('Не найден booking-id в разделе "Предстоящие"');
    return id;
  }

  getBookingCardById(bookingId: string, section: 'upcoming' | 'canceled'): Locator {
    const sectionLocator = section === 'upcoming' ? this.upcomingSection : this.canceledSection;
    return sectionLocator.locator(`[data-booking-id="${bookingId}"]`);
  }

  async getBookingName(bookingId: string, section: 'upcoming' | 'canceled'): Promise<string> {
    const card = this.getBookingCardById(bookingId, section);
    const name = await card.locator('p').first().textContent();
    return name?.trim() || '';
  }

  async cancelBookingById(bookingId: string): Promise<void> {
    const card = this.getBookingCardById(bookingId, 'upcoming');
    await card.getByRole('button', { name: 'Отменить' }).click();
  }
}
