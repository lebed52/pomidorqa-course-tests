import { Locator, type Page } from '@playwright/test';

export const ROUTES = {
  register: '/pomidorqa/auth/register',
  profile: '/pomidorqa/profile',
  slots: '/pomidorqa/profile/slots',
  booking: '/pomidorqa',
};

export class SlotsPage {
  readonly page: Page;

  readonly slotsDateInput: Locator;
  readonly slotsTimeInput: Locator;
  readonly slotsAddSubmit: Locator;
  readonly slotsCard: Locator;

  constructor(page: Page) {
    this.page = page;

    this.slotsDateInput = page.locator('#pomidorqa-slots-date');
    this.slotsTimeInput = page.locator('#pomidorqa-slots-time');
    this.slotsAddSubmit = page.getByRole('button', { name: 'Добавить слот' });
    this.slotsCard = page.locator('[data-slot-id]');
  }

  async goto() {
    await this.page.goto(ROUTES.slots);
  }
}
