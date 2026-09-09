import { test, expect } from "@playwright/test";
import { createApp, closeApps, type AppContext } from "../helpers/booking";
import { makeUser, registerUser, type TestUser } from "../helpers/user";

async function prepareParticipant(
  app: AppContext,
  skill: string,
  time = "12:00",
): Promise<TestUser> {
  const user = makeUser("host");

  await registerUser(app.page, user);

  await app.profilePage.goto();
  await app.profilePage.addSkill(skill, "can_help");

  await app.slotsPage.goto();
  await app.slotsPage.addSlot(time);

  return user;
}

test.describe("PomidorQA: поиск участников", () => {
  test("гость находит участника по уникальному навыку", async ({ browser }) => {
    const hostApp = await createApp(browser);
    const guestApp = await createApp(browser);

    try {
      const skill = `HW13-Search-${Date.now()}`;
      const host = await prepareParticipant(hostApp, skill);

      await test.step("Гость: открывает каталог PomidorQA", async () => {
        await guestApp.bookingPage.goToCatalog();
      });

      await test.step(`Гость: ищет участника по навыку «${skill}»`, async () => {
        await guestApp.bookingPage.searchCatalog(skill);
      });

      await test.step("В выдаче отображается подходящий участник", async () => {
        const card = guestApp.bookingPage.personCard(host.name);

        await expect(card).toHaveCount(1);
        await expect(card).toBeVisible();
      });
    } finally {
      await closeApps([hostApp, guestApp]);
    }
  });

  test("поиск показывает подходящего участника и исключает неподходящего", async ({
    browser,
  }) => {
    const firstHostApp = await createApp(browser);
    const secondHostApp = await createApp(browser);
    const guestApp = await createApp(browser);

    try {
      const firstSkill = `HW13-Skill-A-${Date.now()}`;
      const secondSkill = `HW13-Skill-B-${Date.now()}`;

      const firstHost = await prepareParticipant(firstHostApp, firstSkill, "12:00");
      const secondHost = await prepareParticipant(secondHostApp, secondSkill, "13:00");

      await test.step("Гость: открывает каталог PomidorQA", async () => {
        await guestApp.bookingPage.goToCatalog();
      });

      await test.step(`Гость: ищет участников по навыку «${firstSkill}»`, async () => {
        await guestApp.bookingPage.searchCatalog(firstSkill);
      });

      await test.step("Подходящий участник присутствует в выдаче", async () => {
        const firstCard = guestApp.bookingPage.personCard(firstHost.name);

        await expect(firstCard).toHaveCount(1);
        await expect(firstCard).toBeVisible();
      });

      await test.step("Участник с другим навыком отсутствует в выдаче", async () => {
        const secondCard = guestApp.bookingPage.personCard(secondHost.name);

        await expect(secondCard).toHaveCount(0);
      });
    } finally {
      await closeApps([firstHostApp, secondHostApp, guestApp]);
    }
  });

  test("авторизованный пользователь не видит собственную карточку, а гость видит", async ({
    browser,
  }) => {
    const hostApp = await createApp(browser);
    const guestApp = await createApp(browser);

    try {
      const skill = `HW13-Own-Card-${Date.now()}`;
      const host = await prepareParticipant(hostApp, skill);

      await test.step("Авторизованный пользователь: открывает каталог", async () => {
        await hostApp.bookingPage.goToCatalog();
      });

      await test.step(`Авторизованный пользователь: ищет свой навык «${skill}»`, async () => {
        await hostApp.bookingPage.searchCatalog(skill);
      });

      await test.step("Собственная карточка отсутствует в выдаче", async () => {
        await expect(hostApp.bookingPage.personCard(host.name)).toHaveCount(0);
      });

      await test.step("Гость: открывает каталог", async () => {
        await guestApp.bookingPage.goToCatalog();
      });

      await test.step(`Гость: ищет навык «${skill}»`, async () => {
        await guestApp.bookingPage.searchCatalog(skill);
      });

      await test.step("Гость видит карточку участника", async () => {
        const card = guestApp.bookingPage.personCard(host.name);

        await expect(card).toHaveCount(1);
        await expect(card).toBeVisible();
      });
    } finally {
      await closeApps([hostApp, guestApp]);
    }
  });
});