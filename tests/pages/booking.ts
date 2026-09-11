import { expect, type Locator, type Page } from '@playwright/test';
import { ROUTES } from '../helpers/user';

export class BookingPage {
  readonly page: Page;
  readonly calendarDay: Locator;
  readonly calendarTime: Locator;
  readonly confirmModalDialog: Locator;
  readonly modalDialogConfirm: Locator;
  readonly modalSuccess: Locator;
  readonly modalError: Locator;
  readonly upcomingSession: Locator;
  readonly upcomingBookings: Locator;
  readonly cancelledSection: Locator;
  readonly pastBookings: Locator;

  constructor(page: Page) {
    this.page = page;
    this.calendarDay = page.getByRole('group', { name: 'Дни со слотами' }).getByRole('button');
    this.calendarTime = page.getByRole('group', { name: 'Время слотов' }).getByRole('button');
    this.confirmModalDialog = page.getByRole('dialog');
    this.modalDialogConfirm = page.getByRole('button', { name: 'Подтвердить' });
    this.modalSuccess = page.getByText('Забронировано');
    this.modalError = page.getByText('Этот слот только что забронировали');
    this.upcomingSession = page.getByTestId('upcoming-meetings');
    this.upcomingBookings = this.upcomingSession.locator('[data-booking-id]');
    this.cancelledSection = page.getByRole('heading', { name: 'Прошедшие и отменённые' });
    this.pastBookings = page
      .locator('section')
      .filter({ hasText: 'Прошедшие и отменённые' })
      .locator('[data-booking-id]');
  }

  async waitForFreeSlot() {
    await expect(async () => {
      const dayChip = this.calendarDay.first();
      if (!(await dayChip.isVisible().catch(() => false))) {
        await this.page.reload();
      }
      await expect(dayChip).toBeVisible();
    }).toPass({ timeout: 15_000 });
  }

  async confirmBooking(): Promise<'success' | 'taken'> {
    await this.modalDialogConfirm.click();
    await expect(this.modalSuccess.or(this.modalError)).toBeVisible({ timeout: 15_000 });
    return (await this.modalError.isVisible().catch(() => false)) ? 'taken' : 'success';
  }

  async selectFirstSlot() {
    await expect(async () => {
      await this.calendarDay.first().click();
      await this.calendarTime.first().click();
      await expect(this.confirmModalDialog).toBeVisible();
    }).toPass({ timeout: 15_000 });
  }
  async openBookings() {
    await this.page.goto(ROUTES.bookings);
  }

  upcomingBookingWith(name: string): Locator {
    return this.upcomingBookings.filter({ hasText: name });
  }

  pastBookingWith(name: string): Locator {
    return this.pastBookings.filter({ hasText: name });
  }

  async cancelBookingWith(participantName: string): Promise<'cancelled' | 'not-found'> {
    const booking = this.upcomingBookingWith(participantName);
    const cancelBtn = booking.getByRole('button', { name: 'Отменить' });
    if (!(await cancelBtn.isVisible().catch(() => false))) {
      return 'not-found';
    }
    await cancelBtn.click();
    await expect(this.pastBookingWith(participantName)).toContainText('отменено', {
      timeout: 15_000,
    });
    return 'cancelled';
  }
}
