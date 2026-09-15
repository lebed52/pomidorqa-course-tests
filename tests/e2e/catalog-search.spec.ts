import { test, expect } from "@playwright/test";
import {
  makeRandom,
  makeUser,
  prepareHost,
  registerUser,
  UTC_CONTEXT_OPTIONS,
} from "../helpers/user";
import { ProfilePage } from "../pages/profile-page";
import { BookingPage } from "../pages/booking-page";

test.describe("Каталог: поиск по навыку", () => {
  test("поиск с результатом и пустая выдача: карточку хоста находит гость, сам хост её не видит", async ({
    browser,
  }) => {
    const runId = Date.now();
    const skillTag = makeRandom("Playwright-demo");
    const missingSkillTag = `${skillTag}-missing`;
    const host = makeUser("host", runId);
    const guest = makeUser("guest", runId);

    const hostContext = await browser.newContext(UTC_CONTEXT_OPTIONS);
    const guestContext = await browser.newContext(UTC_CONTEXT_OPTIONS);

    const hostPage = await hostContext.newPage();
    const guestPage = await guestContext.newPage();

    const hostBookingPage = new BookingPage(hostPage);
    const guestBookingPage = new BookingPage(guestPage);

    try {
      await test.step("Хост: регистрируется, добавляет уникальный навык и свободный слот на завтра", async () => {
        await prepareHost(hostPage, host, skillTag);
      });

      await test.step("Хост: ищет в каталоге по своему навыку", async () => {
        await hostBookingPage.gotoCatalog();
        await hostBookingPage.searchBySkill(skillTag);
      });

      await test.step("Хост: собственной карточки в выдаче нет — авторизованный не видит себя", async () => {
        await expect(hostBookingPage.getPersonCard(host.name)).toHaveCount(0);
      });

      await test.step("Гость: регистрируется в отдельном контексте и ищет по навыку хоста", async () => {
        await registerUser(guestPage, guest);

        await guestBookingPage.gotoCatalog();
        await guestBookingPage.searchBySkill(skillTag);
      });

      await test.step("Гость: видит карточку хоста в выдаче — не «первую попавшуюся», а по точному имени", async () => {
        await expect(guestBookingPage.getPersonCard(host.name)).toBeVisible();
      });

      await test.step("Гость: ищет по несуществующему навыку", async () => {
        await guestBookingPage.searchBySkill(missingSkillTag);
      });

      await test.step("Гость: выдача пустая — карточек нет", async () => {
        await expect(guestBookingPage.personCards).toHaveCount(0);
      });
    } finally {
      await hostContext.close();
      await guestContext.close();
    }
  });

  test("хост без будущего свободного слота не попадает в каталог", async ({
    browser,
  }) => {
    const runId = Date.now();
    const skillTag = makeRandom("Playwright-demo");
    const host = makeUser("host", runId);
    const guest = makeUser("guest", runId);

    const hostContext = await browser.newContext(UTC_CONTEXT_OPTIONS);
    const guestContext = await browser.newContext(UTC_CONTEXT_OPTIONS);

    const hostPage = await hostContext.newPage();
    const guestPage = await guestContext.newPage();

    const hostProfile = new ProfilePage(hostPage);
    const guestBookingPage = new BookingPage(guestPage);

    try {
      await test.step("Хост: регистрируется и добавляет уникальный навык, но не добавляет слот", async () => {
        await registerUser(hostPage, host);

        await hostProfile.goto();
        await hostProfile.addSkill(skillTag, "can_help");
        await expect(hostProfile.canHelpSkills).toContainText(skillTag);
      });

      await test.step("Гость: регистрируется в отдельном контексте и ищет по навыку хоста", async () => {
        await registerUser(guestPage, guest);

        await guestBookingPage.gotoCatalog();
        await guestBookingPage.searchBySkill(skillTag);
      });

      await test.step("Гость: хоста нет в каталоге — выдача пустая", async () => {
        await expect(guestBookingPage.personCards).toHaveCount(0);
        await expect(guestBookingPage.getPersonCard(host.name)).toHaveCount(0);
      });
    } finally {
      await hostContext.close();
      await guestContext.close();
    }
  });
});
