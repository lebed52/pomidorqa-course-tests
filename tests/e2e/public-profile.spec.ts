import { expect, test, type BrowserContext } from "@playwright/test";
import { cleanupUsersViaApi, makeUser, registerUserViaApi } from "../helpers/user";
import { BookingPage } from "../pages/booking-page";
import { PersonPage } from "../pages/person-page";
import { ProfilePage } from "../pages/profile-page";

let accountContexts: BrowserContext[] = [];

test.describe("Публичный профиль специалиста", () => {
  test.afterEach(async () => {
    await cleanupUsersViaApi(accountContexts);
    accountContexts = [];
  });

  test("показывает другому участнику сохранённые данные и оба типа навыков", async ({
    browser,
    page,
  }, testInfo) => {
    const runId = Date.now();
    const host = makeUser("public-profile", runId);
    const telegram = `@public_${runId}`;
    const bio = `Публичное описание ${runId}`;
    const canHelpSkill = `PublicHelp-${runId}`;
    const wantToLearnSkill = `PublicLearn-${runId}`;
    const hostContext = await browser.newContext({ baseURL: testInfo.project.use.baseURL });
    accountContexts = [hostContext];
    const hostPage = await hostContext.newPage();
    const profile = new ProfilePage(hostPage);
    const hostBooking = new BookingPage(hostPage);
    const catalog = new BookingPage(page);
    const person = new PersonPage(page);

    await test.step("Специалист заполняет профиль", async () => {
      await registerUserViaApi(hostContext.request, host);
      await profile.goto();
      await profile.addSkill(canHelpSkill, "can_help");
      await profile.addSkill(wantToLearnSkill, "want_to_learn");
      await profile.fillTelegram(telegram);
      await profile.fillBio(bio);
      await profile.save();
    });

    await test.step("Сохранённые навыки отображаются владельцу", async () => {
      await expect(profile.skillChip(canHelpSkill)).toBeVisible();
      await expect(profile.skillChip(wantToLearnSkill)).toBeVisible();
    });

    await test.step("Специалист добавляет свободный слот", async () => {
      const tomorrow = new Date(Date.now() + 24 * 60 * 60 * 1000);
      await hostBooking.gotoSlots();
      await hostBooking.addSlot(tomorrow.toISOString().slice(0, 10), "15:00");
    });

    await test.step("Другой участник открывает специалиста из каталога", async () => {
      await catalog.findPerson(canHelpSkill, host.name);
      await catalog.openPerson(host.name);
    });

    await test.step("Публичная страница содержит данные профиля и оба навыка", async () => {
      await expect(person.name).toHaveText(host.name);
      await expect(person.content).toContainText(telegram);
      await expect(person.content).toContainText(bio);
      await expect(person.canHelpSection).toContainText(canHelpSkill);
      await expect(person.wantToLearnSection).toContainText(wantToLearnSkill);
    });
  });
});
