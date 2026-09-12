import { test, expect, type Browser, type BrowserContext } from "@playwright/test";
import { makeUser } from "../helpers/user";
import { createGuestCatalog, prepareHostForCatalog } from "../helpers/catalog";

test.describe("Каталог: поиск участников по навыкам", () => {
  let contextsToClose: BrowserContext[] = [];

  const registerContext = async (browser: Browser) => {
    const context = await browser.newContext();
    contextsToClose.push(context);
    return context;
  };

  test.beforeEach(() => {
    contextsToClose = [];
  });

  test.afterEach(async () => {
    await Promise.all(contextsToClose.map((context) => context.close()));
  });

  test("Поиск по существующему навыку возвращает карточку участника", async ({ browser }) => {
    const runId = Date.now();
    const skillTag = `Skill-Search-${runId}`;
    const host = makeUser("host", runId);
    await prepareHostForCatalog(browser, registerContext, {
      host,
      skillTag,
    });
    const guestCatalog = await createGuestCatalog(browser, registerContext);

    await test.step("Гость: открывает каталог и ищет хоста по названию навыка", async () => {
      await guestCatalog.gotoCatalog();
      await guestCatalog.searchBySkill(skillTag);
    });

    await test.step("Гость: проверяет, что карточка хоста с навыком отображается в результатах", async () => {
      const hostCard = guestCatalog.getCardByName(host.name);
      await expect(hostCard).toBeVisible();
      await expect(hostCard).toContainText(skillTag);
    });
  });

  test("Поиск по несуществующему навыку не показывает карточку участника", async ({ browser }) => {
    const runId = Date.now();
    const skillTag = `Skill-Valid-${runId}`;
    const nonExistentSkill = `NonExistentSkill-${runId}`;
    const host = makeUser("host", runId);
    await prepareHostForCatalog(browser, registerContext, {
      host,
      skillTag,
    });
    const guestCatalog = await createGuestCatalog(browser, registerContext);

    await test.step("Гость: открывает каталог и вводит несуществующий навык в поиск", async () => {
      await guestCatalog.gotoCatalog();
      await guestCatalog.searchBySkill(nonExistentSkill);
    });

    await test.step("Гость: проверяет, что карточка хоста не отображается в результатах поиска", async () => {
      const hostCard = guestCatalog.getCardByName(host.name);
      await expect(hostCard).not.toBeVisible();
    });
  });

  test("Сброс поиска: пустой запрос возвращает доступных участников", async ({ browser }) => {
    const runId = Date.now();
    const skillTag = `Skill-Reset-${runId}`;
    const host = makeUser("host", runId);
    await prepareHostForCatalog(browser, registerContext, {
      host,
      skillTag,
    });
    const guestCatalog = await createGuestCatalog(browser, registerContext);

    await test.step("Гость: выполняет поиск по точной строке навыка", async () => {
      await guestCatalog.gotoCatalog();
      await guestCatalog.searchBySkill(skillTag);
      await expect(guestCatalog.getCardByName(host.name)).toBeVisible();
    });

    await test.step("Гость: очищает строку поиска и повторно отправляет запрос", async () => {
      await guestCatalog.searchBySkill("");
    });

    await test.step("Гость: проверяет, что карточка хоста снова доступна в общей выдаче", async () => {
      const hostCard = guestCatalog.getCardByName(host.name);
      await expect(hostCard).toBeVisible();
    });
  });
});
