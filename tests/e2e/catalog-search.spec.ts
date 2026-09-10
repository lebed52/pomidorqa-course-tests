import { test, expect } from "@playwright/test";
import { dateInDays, makeUser, registerInNewContext } from "../helpers/user";
import { ProfilePage } from "../pages/profile-page";
import { SlotsPage } from "../pages/slots-page";
import { BookingPage } from "../pages/booking-page";

// Каталог PomidorQA отвечает на вопрос «кто может мне помочь и когда».
// Оба сценария проверяют именно это: сколько времени у человека свободно
// и с чем он готов помочь. Смотрим глазами гостя — свою карточку
// авторизованный участник не видит.

test.describe("Каталог: карточка участника", () => {
  test("счётчик свободных слотов в карточке растёт вслед за слотами хоста", async ({
    browser,
  }) => {
    const runId = Date.now();
    const skillTag = `Playwright-slots-${runId}`;
    const host = makeUser("slotshost", runId);
    const guest = makeUser("slotsguest", runId);

    const hostPage = await registerInNewContext(browser, host);
    const guestPage = await registerInNewContext(browser, guest);

    try {
      const hostProfile = new ProfilePage(hostPage);
      const hostSlots = new SlotsPage(hostPage);
      const guestCatalog = new BookingPage(guestPage);

      await test.step("Хост объявляет навык «могу помочь»", async () => {
        await hostProfile.open();
        await hostProfile.addSkill(skillTag, "can_help");
      });

      await test.step("Хост выкладывает один свободный слот", async () => {
        await hostSlots.open();
        await hostSlots.addSlot(dateInDays(1), "12:00");
      });

      await test.step("Гость ищет хоста в каталоге по навыку", async () => {
        await guestCatalog.searchBySkill(skillTag);
      });

      await test.step("Хост нашёлся в результатах поиска", async () => {
        await expect(guestCatalog.personCard(host.name)).toBeVisible();
      });

      await test.step("В карточке хоста показан один свободный слот", async () => {
        await expect(guestCatalog.personCardSlots(host.name)).toHaveText("1 своб. слотов");
      });

      await test.step("Хост выкладывает второй слот", async () => {
        await hostSlots.open();
        await hostSlots.addSlot(dateInDays(2), "12:00");
      });

      await test.step("Гость повторяет поиск", async () => {
        await guestCatalog.searchBySkill(skillTag);
      });

      await test.step("Счётчик в карточке стал показывать два слота", async () => {
        await expect(guestCatalog.personCardSlots(host.name)).toHaveText("2 своб. слотов");
      });
    } finally {
      await hostPage.context().close();
      await guestPage.context().close();
    }
  });

  test("в карточке видны только навыки «могу помочь», «хочу разобрать» не показывают", async ({
    browser,
  }) => {
    const runId = Date.now();
    const canHelpTag = `Playwright-canhelp-${runId}`;
    const wantToLearnTag = `Playwright-wantlearn-${runId}`;
    const host = makeUser("skillshost", runId);
    const guest = makeUser("skillsguest", runId);

    const hostPage = await registerInNewContext(browser, host);
    const guestPage = await registerInNewContext(browser, guest);

    try {
      const hostProfile = new ProfilePage(hostPage);
      const hostSlots = new SlotsPage(hostPage);
      const guestCatalog = new BookingPage(guestPage);

      await test.step("Хост объявляет один навык «могу помочь» и один «хочу разобрать»", async () => {
        await hostProfile.open();
        await hostProfile.addSkill(canHelpTag, "can_help");
        await hostProfile.addSkill(wantToLearnTag, "want_to_learn");
      });

      await test.step("Хост выкладывает свободный слот, чтобы попасть в каталог", async () => {
        await hostSlots.open();
        await hostSlots.addSlot(dateInDays(1), "12:00");
      });

      await test.step("Гость ищет хоста по навыку «могу помочь»", async () => {
        await guestCatalog.searchBySkill(canHelpTag);
      });

      await test.step("Хост нашёлся в результатах поиска", async () => {
        await expect(guestCatalog.personCard(host.name)).toBeVisible();
      });

      await test.step("В карточке ровно один чип — тот, с которым хост готов помочь", async () => {
        await expect(guestCatalog.personCardSkills(host.name)).toHaveText([canHelpTag]);
      });

      await test.step("Навык «хочу разобрать» в карточке не показан", async () => {
        await expect(guestCatalog.personCard(host.name)).not.toContainText(wantToLearnTag);
      });
    } finally {
      await hostPage.context().close();
      await guestPage.context().close();
    }
  });
});
