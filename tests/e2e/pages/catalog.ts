import { expect, type Locator, type Page } from '@playwright/test';
import { type TestUser } from '../helpers/user';

export class CatalogPage {
  readonly page: Page;
  readonly catalogFilterInput: Locator;
  readonly btnSearch: Locator;
  readonly personCard: Locator;
  readonly personName: Locator;

  constructor(page: Page) {
    this.page = page;
    this.catalogFilterInput = page.locator('#pomidorqa-catalog-skill-filter');
    this.btnSearch = page.getByRole('button', { name: 'Найти' });
    this.personCard = page.locator('[data-testid="person-card"]');
    this.personName = page.locator('h1');
  }
}
