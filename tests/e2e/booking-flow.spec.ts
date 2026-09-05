import { test, expect } from "@playwright/test";
import { makeUser, registerUser } from "../helpers/user";
import { BookingPage } from "../pages/booking-page";
import { ProfilePage } from "../pages/profile-page";

test.describe("Бронирование слота", () => {
  test("хост регистрируется и заполняет профиль", async ({ page }) => {
    const host = makeUser("host", Date.now());
    const profile = new ProfilePage(page);
    const telegram = `@host_${Date.now()}`;
    const bio = `Хост, прогон ${Date.now()}`;

    await test.step("Хост: регистрируется в PomidorQA", async () => {
      await registerUser(page, host);
    });

    await test.step("Хост: заполняет профиль", async () => {
      await profile.goto();
      await profile.fillProfileName(host.name);
      await profile.fillProfileTelegram(telegram);
      await profile.fillProfileBio(bio);
      await profile.saveProfile();
    });

    await test.step("После перезагрузки данные хоста сохранились", async () => {
      await page.reload();
      await expect(profile.profileNameInput).toHaveValue(host.name);
      await expect(profile.profileTelegramInput).toHaveValue(telegram);
      await expect(profile.profileBioInput).toHaveValue(bio);
    });
  });

  test("гость регистрируется и заполняет профиль", async ({ page }) => {
    const guest = makeUser("guest", Date.now());
    const profile = new ProfilePage(page);
    const telegram = `@guest_${Date.now()}`;
    const bio = `Гость, прогон ${Date.now()}`;

    await test.step("Гость: регистрируется в PomidorQA", async () => {
      await registerUser(page, guest);
    });

    await test.step("Гость: заполняет профиль", async () => {
      await profile.goto();
      await profile.fillProfileName(guest.name);
      await profile.fillProfileTelegram(telegram);
      await profile.fillProfileBio(bio);
      await profile.saveProfile();
    });

    await test.step("После перезагрузки данные гостя сохранились", async () => {
      await page.reload();
      await expect(profile.profileNameInput).toHaveValue(guest.name);
      await expect(profile.profileTelegramInput).toHaveValue(telegram);
      await expect(profile.profileBioInput).toHaveValue(bio);
    });
  });

  test("гость бронирует слот хоста", async ({ browser }) => {
    const runId = Date.now();
    const skillTag = `Playwright-demo-${runId}`;
    const host = makeUser("host", runId);
    const guest = makeUser("guest", runId);

    const hostContext = await browser.newContext();
    const guestContext = await browser.newContext();
    const hostPage = await hostContext.newPage();
    const guestPage = await guestContext.newPage();

    const hostProfile = new ProfilePage(hostPage);
    const guestProfile = new ProfilePage(guestPage);
    const hostBooking = new BookingPage(hostPage);
    const guestBooking = new BookingPage(guestPage);

    try {
      await test.step("Хост: регистрируется в PomidorQA", async () => {
        await registerUser(hostPage, host);
      });

      await test.step("Хост: заполняет профиль и добавляет навык", async () => {
        await hostProfile.goto();
        await hostProfile.fillProfileName(host.name);
        await hostProfile.fillProfileTelegram(`@host_${runId}`);
        await hostProfile.fillProfileBio(`Хост, прогон ${runId}`);
        await hostProfile.saveProfile();
        await hostProfile.goto();
        await hostProfile.addSkill(skillTag);
        await expect(hostProfile.canHelpSkills).toContainText(skillTag);
      });

      await test.step("Хост: добавляет свободный слот", async () => {
        await hostBooking.gotoSlots();
        await hostBooking.addTomorrowSlot();
        await expect(hostBooking.slotCard.first()).toBeVisible();
      });

      await test.step("Гость: регистрируется в PomidorQA", async () => {
        await registerUser(guestPage, guest);
      });

      await test.step("Гость: заполняет профиль", async () => {
        await guestProfile.goto();
        await guestProfile.fillProfileName(guest.name);
        await guestProfile.fillProfileTelegram(`@guest_${runId}`);
        await guestProfile.fillProfileBio(`Гость, прогон ${runId}`);
        await guestProfile.saveProfile();
      });

      await test.step("Гость: находит хоста и выбирает бронь", async () => {
        await guestBooking.search(skillTag);
        await guestBooking.openPerson(host.name);
        await expect(guestBooking.personName).toHaveText(host.name);
        await guestBooking.openFirstSlot();
        await expect(guestBooking.bookingConfirmDialog).toBeVisible();
        await guestBooking.confirm();
        await expect(
          guestBooking.bookingConfirmSuccess.or(guestBooking.bookingConfirmError),
        ).toBeVisible({ timeout: 15_000 });
        await expect(guestBooking.bookingConfirmError).toBeHidden();
      });
    } finally {
      await hostContext.close();
      await guestContext.close();
    }
  });
});
