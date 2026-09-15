import { test, expect, type BrowserContext } from "@playwright/test";
import { makeUser, registerUser, type TestUser } from "../helpers/user";
import { ProfilePage } from "../pages/profile-page";
import { BookingPage } from "../pages/booking-page";

test.describe("Каталог: поиск карточек по навыку", () => {
  let numericSkill: string;
  let alphaSkill: string;
  let numericHost: TestUser;
  let alphaHost: TestUser;

  let guestContext: BrowserContext;
  let catalog: BookingPage;

  test.beforeAll(async ({ browser }) => {
    const runId = Date.now();
    numericSkill = String(runId);
    alphaSkill = `Skill${digitsToLetters(runId)}`;

    numericHost = makeUser("host-num", runId);
    alphaHost = makeUser("host-alpha", runId);
    const guest = makeUser("guest", runId);

    const hostContexts = [await browser.newContext(), await browser.newContext()];
    try {
      await registerHostWithSkill(hostContexts[0], numericHost, numericSkill);
      await registerHostWithSkill(hostContexts[1], alphaHost, alphaSkill);
    } finally {
      for (const context of hostContexts) {
        await context.close();
      }
    }

    guestContext = await browser.newContext();
    const guestPage = await guestContext.newPage();
    await registerUser(guestPage, guest);
    catalog = new BookingPage(guestPage);
  });

  test.beforeEach(async () => {
    await catalog.openCatalog();
  });

  test.afterAll(async () => {
    await guestContext?.close();
  });

  test("пустой поиск: показаны карточки обоих хостов", async () => {
    await test.step("Гость: ищет с пустым фильтром", async () => {
      await catalog.searchInCatalog("");
    });

    await test.step("Обе карточки хостов показаны", async () => {
      await expect(catalog.catalogCardByName(numericHost.name)).toBeVisible();
      await expect(catalog.catalogCardByName(alphaHost.name)).toBeVisible();
    });
  });

  test("один символ числового навыка: показана карточка числового хоста", async () => {
    await test.step("Гость: ищет по первому символу числового навыка", async () => {
      await catalog.searchInCatalog(numericSkill.slice(0, 1));
    });

    await test.step("Карточка числового хоста показана", async () => {
      await expect(catalog.catalogCardByName(numericHost.name)).toBeVisible();
    });
  });

  test("полный числовой навык: показана карточка числового хоста", async () => {
    await test.step("Гость: ищет по числовому навыку целиком", async () => {
      await catalog.searchInCatalog(numericSkill);
    });

    await test.step("Карточка числового хоста показана", async () => {
      await expect(catalog.catalogCardByName(numericHost.name)).toBeVisible();
    });
  });

  test("один символ буквенного навыка: показана карточка буквенного хоста", async () => {
    await test.step("Гость: ищет по первому символу буквенного навыка", async () => {
      await catalog.searchInCatalog(alphaSkill.slice(0, 1));
    });

    await test.step("Карточка буквенного хоста показана", async () => {
      await expect(catalog.catalogCardByName(alphaHost.name)).toBeVisible();
    });
  });

  test("полный буквенный навык: показана карточка буквенного хоста", async () => {
    await test.step("Гость: ищет по буквенному навыку целиком", async () => {
      await catalog.searchInCatalog(alphaSkill);
    });

    await test.step("Карточка буквенного хоста показана", async () => {
      await expect(catalog.catalogCardByName(alphaHost.name)).toBeVisible();
    });
  });

  test("негатив: по несуществующему навыку ни одна из карточек не показана", async () => {
    await test.step("Гость: ищет навык, которого нет ни у одного хоста", async () => {
      await catalog.searchInCatalog(`${alphaSkill}-несуществующий-${numericSkill}`);
    });

    await test.step("Ни одна карточка хостов не показана", async () => {
      await expect(catalog.catalogCardByName(numericHost.name)).not.toBeVisible();
      await expect(catalog.catalogCardByName(alphaHost.name)).not.toBeVisible();
    });
  });

  async function registerHostWithSkill(context: BrowserContext, host: TestUser, skill: string) {
    const page = await context.newPage();
    await registerUser(page, host);

    const profile = new ProfilePage(page);
    await profile.open();
    await profile.addSkill(skill, "can_help");
    await expect(profile.canHelpSkills).toContainText(skill);

    const booking = new BookingPage(page);
    await booking.openSlots();
    const tomorrow = new Date(Date.now() + 24 * 60 * 60 * 1000);
    await booking.addSlot(tomorrow.toISOString().slice(0, 10), "12:00");
    await expect(booking.slotCards.first()).toBeVisible();
  }
});

function digitsToLetters(value: number): string {
  return String(value)
    .split("")
    .map((digit) => "abcdefghij"[Number(digit)])
    .join("");
}
