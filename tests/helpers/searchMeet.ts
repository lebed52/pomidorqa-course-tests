import type { Browser, BrowserContext, Page } from '@playwright/test';
import { makeUnique, makeUser, registerUser, type TestUser } from './user';
import { CatalogPage } from '../pages/catalog';
import { ProfilePage } from '../pages/profile';
import { SlotsPage } from '../pages/slots';

export type SearchMeet = {
  host: TestUser;
  guest: TestUser;
  skillTag: string;
  hostContext: BrowserContext;
  guestContext: BrowserContext;
  hostPage: Page;
  guestPage: Page;
  hostProfile: ProfilePage;
  hostSlots: SlotsPage;
  guestCatalog: CatalogPage;
  close: () => Promise<void>;
};

export async function searchMeet(browser: Browser): Promise<SearchMeet> {
  const runId = Date.now();
  const skillTag = makeUnique('Search');
  const host = makeUser(makeUnique('lalala'), runId);
  const guest = makeUser(makeUnique('rororo'), runId);

  const hostContext = await browser.newContext();
  const guestContext = await browser.newContext();
  const hostPage = await hostContext.newPage();
  const guestPage = await guestContext.newPage();

  const hostProfile = new ProfilePage(hostPage);
  const hostSlots = new SlotsPage(hostPage);
  const guestCatalog = new CatalogPage(guestPage);

  await registerUser(hostPage, host);
  await hostProfile.open();
  await hostProfile.addSkill(skillTag);
  await hostSlots.open();
  const tomorrow = new Date(Date.now() + 24 * 60 * 60 * 1000);
  await hostSlots.addSlot(tomorrow.toISOString().slice(0, 10), '12:00');

  await registerUser(guestPage, guest);

  return {
    host,
    guest,
    skillTag,
    hostContext,
    guestContext,
    hostPage,
    guestPage,
    hostProfile,
    hostSlots,
    guestCatalog,
    close: async () => {
      await hostContext.close();
      await guestContext.close();
    },
  };
}
