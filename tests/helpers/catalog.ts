import { expect, test, type Browser, type BrowserContext } from "@playwright/test";
import { registerUser, type TestUser } from "./user";
import { ProfilePage } from "../pages/profile-page";
import { BookingPage } from "../pages/booking-page";
import { CatalogPage } from "../pages/catalog-page";

type RegisterContext = (browser: Browser) => Promise<BrowserContext>;

type HostSetupData = {
  host: TestUser;
  skillTag: string;
};

export async function prepareHostForCatalog(
  browser: Browser,
  registerContext: RegisterContext,
  { host, skillTag }: HostSetupData
) {
  const hostContext = await registerContext(browser);
  const hostPage = await hostContext.newPage();
  const hostProfile = new ProfilePage(hostPage);
  const hostBooking = new BookingPage(hostPage);

  await test.step("Хост: регистрируется в сервисе", async () => {
    await registerUser(hostPage, host);
  });

  await test.step("Хост: добавляет навык «могу помочь» в профиле", async () => {
    await hostProfile.goto();
    await hostProfile.addSkill(skillTag, "can_help");
    await expect(hostProfile.canHelpSkills).toContainText(skillTag);
  });

  await test.step("Хост: добавляет свободный слот на завтра", async () => {
    await hostBooking.gotoSlots();
    await hostBooking.addSlot();
    await expect(hostBooking.slotsCard.first()).toBeVisible();
  });
}

export async function createGuestCatalog(
  browser: Browser,
  registerContext: RegisterContext
): Promise<CatalogPage> {
  const guestContext = await registerContext(browser);
  const guestPage = await guestContext.newPage();
  return new CatalogPage(guestPage);
}
