import { type Locator, type Page } from '@playwright/test';

export class SlotsPage {
  readonly page: Page;
  readonly slotDate: Locator;
  readonly slotTime: Locator;
  readonly btnAddSlot: Locator;
  readonly freeSlots: Locator;

  constructor(page: Page) {
    this.page = page;
    this.slotDate = page.locator('#pomidorqa-slots-date');
    this.slotTime = page.locator('#pomidorqa-slots-time');
    this.btnAddSlot = page.getByRole('button', { name: 'Добавить' });
    this.freeSlots = page.locator('div[data-slot-status="free"]');
  }

  async open() {
    await this.page.goto('/pomidorqa/profile/slots');
  }

  async addSlot(date: string, time: string) {
    await this.slotDate.fill(date);
    await this.slotTime.fill(time);
    await this.btnAddSlot.click();
  }
}
