import { type Page, expect } from "@playwright/test";

export class BookingPage {
  constructor(private readonly page: Page) {}

  catalogFilterInput = () => this.page.locator('#pomidorqa-catalog-skill-filter');
  catalogFilterSubmit = () => this.page.getByRole('button', { name: 'Найти' });
  catalogCard = (name: string) =>
    this.page.locator('[data-testid="person-card"]').filter({ hasText: name });

  personName = () => this.page.getByRole('heading', { level: 1 });

  bookingDay = (date: string) => this.page.locator(`button[data-date="${date}"]`);
  anyTime = () => this.page.locator('button[data-slot-id]').first();
  bookingDialog = () => this.page.getByRole('dialog');

  bookingConfirmButton = () => this.page.getByRole('button', { name: 'Подтвердить' });
  bookingSuccess = () => this.bookingDialog().getByText(/Забронировано|успешно/i);
  bookingError = () => this.bookingDialog().getByText(/забронировали|занят|выбери другой/i);

  upcomingSection = () => this.page.locator('[data-testid="upcoming-meetings"]');
  upcomingCardName = () => this.upcomingSection().getByRole('heading').first();

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

  async goToBookings() {
    await this.page.goto('/pomidorqa/bookings');
  }
}