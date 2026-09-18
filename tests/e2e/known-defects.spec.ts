import { expect, test, type BrowserContext } from "@playwright/test";
import { slotFormValues } from "../helpers/slot-time";
import { cleanupUsersViaApi, makeUser, registerUserViaApi } from "../helpers/user";
import { BookingPage } from "../pages/booking-page";
import { ProfilePage } from "../pages/profile-page";

// Расхождения требований и продукта. Тесты написаны по требованиям, а не по текущему
// поведению, и помечены test.fail(): пока дефект жив, ожидаемый результат — падение.
// Как только продукт починят, Playwright сообщит «expected to fail, but passed» —
// и тест нужно будет перевести в обычный. Так дыра не исчезает из отчёта и не
// маскируется зелёной галочкой. Каждый дефект описан в docs/coverage-matrix.md.
//
// Два прежних дефекта отсюда уже уехали в обычные тесты после правок в продукте:
// часовой пояс слотов — slot-timezone.spec.ts, окно отмены — cancel-window.spec.ts.

let accountContexts: BrowserContext[] = [];

test.describe("Известные дефекты PomidorQA", () => {
  test.afterEach(async () => {
    await cleanupUsersViaApi(accountContexts);
    accountContexts = [];
  });

  // KD-3, требования п.8: каталог фильтрует по навыкам из раздела «могу помочь».
  // Фактически: фильтр ищет по всем навыкам участника, включая «хочу разобрать»,
  // поэтому по запросу «Playwright» находится и тот, кто Playwright только изучает.
  test.fail("поиск в каталоге не находит специалиста по навыку «хочу разобрать»", async ({
    browser,
    page,
  }, testInfo) => {
    const runId = Date.now();
    const host = makeUser("catalog-skill-type", runId);
    const canHelpSkill = `HelpAnchor-${runId}`;
    const wantToLearnSkill = `LearnOnly-${runId}`;
    const hostContext = await browser.newContext({ baseURL: testInfo.project.use.baseURL });
    accountContexts = [hostContext];
    const hostPage = await hostContext.newPage();
    const hostProfile = new ProfilePage(hostPage);
    const hostSlots = new BookingPage(hostPage);
    const catalog = new BookingPage(page);

    await test.step("Хост заводит по одному навыку каждого типа и свободный слот", async () => {
      await registerUserViaApi(hostContext.request, host);
      await hostProfile.goto();
      await hostProfile.addSkill(canHelpSkill, "can_help");
      await hostProfile.addSkill(wantToLearnSkill, "want_to_learn");
      await hostSlots.gotoSlots();
      const { date } = slotFormValues(24 * 60 * 60 * 1000);
      await hostSlots.addSlot(date, "19:00");
    });

    await test.step("По навыку «могу помочь» хост в каталоге есть", async () => {
      await catalog.findPerson(canHelpSkill, host.name);
      await expect(catalog.personCard(host.name)).toBeVisible();
    });

    await test.step("По навыку «хочу разобрать» выдача пустая", async () => {
      await catalog.gotoCatalog();
      await catalog.searchBySkill(wantToLearnSkill);
      await expect(catalog.personCard(host.name)).toHaveCount(0);
    });
  });
});
