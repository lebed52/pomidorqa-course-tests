import { expect, type Locator, type Page } from '@playwright/test';
import { type TestUser } from '../helpers/user';

export class CatalogPage {
  readonly page: Page;
  readonly catalogFilterInput: Locator;
  readonly btnSearch: Locator;
  readonly personCard: Locator;
  readonly personName: Locator;
  readonly emptyResult: Locator;

  constructor(page: Page) {
    this.page = page;
    this.catalogFilterInput = page.locator('#pomidorqa-catalog-skill-filter');
    this.btnSearch = page.getByRole('button', { name: 'Найти' });
    this.personCard = page.locator('[data-testid="person-card"]');
    this.personName = page.locator('h1');
    this.emptyResult = page.getByText('Пока никого не нашли по этому фильтру');
  }

  getPersonCard(name: string): Locator {
    return this.personCard.filter({ hasText: name });
  }

  async searchBy(skillTag: string) {
    await this.catalogFilterInput.fill(skillTag);
    await this.btnSearch.click();
  }

  /** Открывает каталог. */
  async goto() {
    await this.page.goto('/pomidorqa');
  }
}
