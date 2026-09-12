import { test, expect, type BrowserContext } from "@playwright/test";
import { deleteUserViaApi } from "../helpers/user";
import { prepareSearchFlow } from "../helpers/search-flow";

test.describe("Поиск пользователя в каталоге", () => {
  let contexts: BrowserContext[] = [];

  test.afterEach(async () => {
    await deleteUserViaApi(contexts[0].request);
  
    await contexts[0].close();
    await contexts[1].close();
  
    contexts = [];
  });

  test("Гость находит пользователя в каталоге по уникальному навыку", async ({
    browser,
  }) => {
    const { skill, slotDate, host, hostContext, guestContext, hostPage, guestPage, hostProfile, hostBooking, guestBooking,
    } = await prepareSearchFlow(browser);

    contexts = [hostContext, guestContext];

    await test.step("Хост добавляет уникальный навык", async () => {
      await hostPage.goto("/pomidorqa/profile");
      await hostProfile.addSkill(skill);
    });

    await test.step("Проверяем, что навык добавлен", async () => {
      await expect(
        hostPage.getByTestId("can-help-skills"),
      ).toContainText(skill);
    });

    await test.step("Хост добавляет свободный слот на завтра", async () => {
      await hostPage.goto("/pomidorqa/profile/slots");
      await hostBooking.addSlot(slotDate, "12:00");
    });

    await test.step("Проверяем, что свободный слот создан", async () => {
      await expect(hostBooking.freeSlot()).toBeVisible();
    });

    await test.step("Гость выполняет поиск по уникальному навыку", async () => {
      await guestPage.goto("/pomidorqa/");
      await guestBooking.searchBySkill(skill);
    });

    await test.step("Проверяем, что в результатах найден хост", async () => {
      const hostCard = guestBooking.catalogCard(host.name);

      await expect(hostCard).toBeVisible();
      await expect(hostCard).toContainText(skill);
    });
  });
});