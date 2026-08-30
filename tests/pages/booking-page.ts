import { type Page, expect } from "@playwright/test";

export class BookingPage {
  constructor(private readonly page: Page) {}

  private catalogFilterInput = () => this.page.locator('#pomidorqa-catalog-skill-filter');
  private catalogFilterSubmit = () => this.page.getByRole('button', { name: 'Найти' });
  private catalogCard = (name: string) =>
    this.page.locator('[data-testid="person-card"]').filter({ hasText: name });

  private personName = () => this.page.getByRole('heading', { level: 1 });

  private bookingDay = (date: string) => this.page.locator(`button[data-date="${date}"]`);
  private anyTime = () => this.page.locator('button[data-slot-id]').first();
  private bookingDialog = () => this.page.getByRole('dialog');

  private bookingConfirmButton = () => this.page.getByRole('button', { name: 'Подтвердить' });
  private bookingSuccess = () => this.bookingDialog().getByText(/Забронировано|успешно/i);
  private bookingError = () => this.bookingDialog().getByText(/забронировали|занят|выбери другой/i);

  private upcomingSection = () => this.page.locator('[data-testid="upcoming-meetings"]');

  async searchBySkill(skillTag: string) {
    await this.catalogFilterInput().fill(skillTag);
    await this.catalogFilterSubmit().click();
  }

  async openHostCard(hostName: string) {
    await this.catalogCard(hostName).click();
    await expect(this.personName()).toHaveText(hostName);
  }

  async selectDayAndTime(slotDate: string) {

    await expect(async () => {
      const dayChip = this.bookingDay(slotDate);
      if (!(await dayChip.isVisible().catch(() => false))) {
        await this.page.reload();
      }
      await expect(dayChip).toBeVisible();
    }).toPass({ timeout: 10_000 });

    await this.bookingDay(slotDate).click();
    await this.page.waitForSelector('button[data-slot-id]', { timeout: 10000 });

    const timeButton = this.anyTime();
    await expect(timeButton).toBeVisible({ timeout: 10000 });
    await timeButton.click();
    await expect(this.bookingDialog()).toBeVisible({ timeout: 10000 });
  }

  async confirmBooking() {
    await this.bookingConfirmButton().click();
  }

  async expectBookingSuccess() {
    const success = this.bookingSuccess();
    const error = this.bookingError();
    await expect(success.or(error)).toBeVisible({ timeout: 15000 });
    if (await error.isVisible().catch(() => false)) {
      throw new Error(`Бронирование не удалось: ${await error.textContent()}`);
    }
  }

  async expectBookingError() {
    const success = this.bookingSuccess();
    const error = this.bookingError();
    await expect(success.or(error)).toBeVisible({ timeout: 15000 });
    if (await success.isVisible().catch(() => false)) {
      throw new Error('Слот должен был быть занят, но бронирование прошло успешно');
    }
    await expect(error).toBeVisible();
  }

  async expectUpcomingBookingForGuest(hostName: string) {
    await expect(async () => {
      await this.page.goto('/pomidorqa/bookings');
      await expect(this.upcomingSection()).toBeVisible({ timeout: 5000 });
      await expect(this.upcomingSection().getByText(hostName)).toBeVisible({ timeout: 5000 });
    }).toPass({ timeout: 10000 });
  }

  async expectUpcomingBookingForHost(guestName: string) {
    await expect(async () => {
      await this.page.goto('/pomidorqa/bookings');
      await expect(this.upcomingSection()).toBeVisible({ timeout: 5000 });
      await expect(this.upcomingSection().getByText(guestName)).toBeVisible({ timeout: 5000 });
    }).toPass({ timeout: 10000 });
  }
}
