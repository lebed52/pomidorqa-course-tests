import { type Browser, type BrowserContext, type Page } from "@playwright/test";

/*export type UsersContext = {
  hostContext: BrowserContext;
  guestContext: BrowserContext;
  hostPage: Page;
  guestPage: Page;
  host2Context: BrowserContext;
  host2Page: Page;
  guest2Context: BrowserContext;
  guest2Page: Page;
};*/

/*export async function createUsersContext(browser: Browser): Promise<UsersContext> {*/ 

export async function createUsersContext(browser: Browser) {
  const hostContext = await browser.newContext();
  const guestContext = await browser.newContext();
  const hostPage = await hostContext.newPage();
  const guestPage = await guestContext.newPage();
  
  return {
    hostContext,
    guestContext,
    hostPage,
    guestPage
  };
}

export async function createAdditionalContext(browser: Browser) {
  const additionalContext = await browser.newContext();
  const additionalPage = await additionalContext.newPage();
  return { additionalContext, additionalPage };
}

/*export async function closeUsersContext(browser: Browser): Promise<UsersContext> {
    await hostContext.close();
    await host2Context.close();
    await guestContext.close();
}*/



