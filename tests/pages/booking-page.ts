import { type Page } from "@playwright/test";

export class BookingPage {
  constructor(private readonly page: Page) {}

  catalogFilterInput = () => this.page.locator('#pomidorqa-catalog-skill-filter');
  catalogFilterSubmit = () => this.page.getByRole('button', { name: 'Найти' });
  catalogCard = (name: string) =>
    this.page.locator('[data-testid="person-card"]').filter({ hasText: name });

  personName = () => this.page.getByRole('heading', { level: 1 });
  slotDateInput = () => this.page.locator('input[type="date"]');
  slotTimeInput = () => this.page.locator('input[type="time"]');
  slotAddSubmit = () =>
    this.page.getByRole('button', { name: 'Добавить слот' });
  slotCard = () =>
    this.page.locator('[data-slot-status="free"]').first();
  
  async addSlot(date: string, time: string) {
    await this.slotDateInput().fill(date);
    await this.slotTimeInput().fill(time);
    await this.slotAddSubmit().click();
  }
  
  freeSlot = () => this.slotCard();

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
  }


  async selectDayAndTime(slotDate: string) {
    const dayChip = this.bookingDay(slotDate);
  
    if (!(await dayChip.isVisible().catch(() => false))) {
      await this.page.reload();
    }
  
    await dayChip.waitFor({
      state: "visible",
      timeout: 10_000,
    });
  
    await dayChip.click();
  
    const timeButton = this.anyTime();
  
    await timeButton.waitFor({
      state: "visible",
      timeout: 10_000,
    });
  
    await timeButton.click();
  
    await this.bookingDialog().waitFor({
      state: "visible",
      timeout: 10_000,
    });
  }

  async confirmBooking() {
    await this.bookingConfirmButton().click();
  }

  async goToBookings() {
    await this.page.goto('/pomidorqa/bookings');
  }
}