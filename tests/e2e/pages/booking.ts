import { expect, type Locator, type Page } from '@playwright/test';

export class BookingPage {
  readonly page: Page;
  readonly calendarDay: Locator;
  readonly calendarTime: Locator;
  readonly confirmModalDialog: Locator;
  readonly modalDialogConfirm: Locator;
  readonly modalSuccess: Locator;
  readonly modalError: Locator;
  readonly upcomingSession: Locator;

  constructor(page: Page) {
    this.page = page;
    this.calendarDay = page.locator('[aria-pressed="true"]');
    this.calendarTime = page.getByRole('group', { name: 'Время слотов' }).getByRole('button');
    this.confirmModalDialog = page.locator('[role="dialog"]');
    this.modalDialogConfirm = page.getByRole('button', { name: 'Подтвердить' });
    this.modalSuccess = page.getByText('Забронировано');
    this.modalError = page.getByText('Этот слот только что забронировали');
    this.upcomingSession = page.getByTestId('upcoming-meetings');
  }
  async open() {
    await this.page.goto('/pomidorqa/profile/booking');
  }
}
