import { expect, test, type BrowserContext } from "@playwright/test";
import { cleanupUsersViaApi, makeUser, registerUserViaApi } from "../helpers/user";
import { ProfilePage } from "../pages/profile-page";

// Требования п.6: навык принадлежит участнику и имеет тип, один и тот же навык одного
// типа нельзя добавить повторно, удалить свой навык участник может в любой момент.
// Проверки полей профиля живут отдельно — в profile-flow.spec.ts.

let accountContexts: BrowserContext[] = [];

test.describe("Профиль: список навыков", () => {
  test.afterEach(async () => {
    await cleanupUsersViaApi(accountContexts);
    accountContexts = [];
  });

  test("повторное добавление того же навыка не создаёт дубль", async ({ browser }, testInfo) => {
    const runId = Date.now();
    const user = makeUser("skill-duplicate", runId);
    const skill = `Duplicate-${runId}`;
    const context = await browser.newContext({ baseURL: testInfo.project.use.baseURL });
    accountContexts = [context];
    const profile = new ProfilePage(await context.newPage());

    await test.step("Создаём участника и добавляем навык «могу помочь»", async () => {
      await registerUserViaApi(context.request, user);
      await profile.goto();
      await profile.addSkill(skill, "can_help");
    });

    await test.step("Отправляем тот же навык того же типа второй раз", async () => {
      await profile.submitSkill(skill, "can_help");
    });

    await test.step("После перезагрузки навык в профиле остался ровно один", async () => {
      await profile.page.reload();
      await expect(profile.skillChip(skill)).toHaveCount(1);
    });
  });

  test("тот же навык другого типа добавляется как отдельная запись", async ({
    browser,
  }, testInfo) => {
    const runId = Date.now();
    const user = makeUser("skill-both-types", runId);
    const skill = `BothTypes-${runId}`;
    const context = await browser.newContext({ baseURL: testInfo.project.use.baseURL });
    accountContexts = [context];
    const profile = new ProfilePage(await context.newPage());

    await test.step("Создаём участника и добавляем навык в «могу помочь»", async () => {
      await registerUserViaApi(context.request, user);
      await profile.goto();
      await profile.addSkill(skill, "can_help");
    });

    await test.step("Добавляем тот же текст навыка в «хочу разобрать»", async () => {
      await profile.submitSkill(skill, "want_to_learn");
    });

    await test.step("После перезагрузки навык есть в обоих разделах", async () => {
      await profile.page.reload();
      await expect(profile.skillsSection("can_help")).toContainText(skill);
      await expect(profile.skillsSection("want_to_learn")).toContainText(skill);
    });
  });

  test("удаление навыка убирает только его, остальные остаются", async ({ browser }, testInfo) => {
    const runId = Date.now();
    const user = makeUser("skill-remove", runId);
    const removedSkill = `RemoveMe-${runId}`;
    const keptSkill = `KeepMe-${runId}`;
    const context = await browser.newContext({ baseURL: testInfo.project.use.baseURL });
    accountContexts = [context];
    const profile = new ProfilePage(await context.newPage());

    await test.step("Создаём участника с двумя навыками «могу помочь»", async () => {
      await registerUserViaApi(context.request, user);
      await profile.goto();
      await profile.addSkill(removedSkill, "can_help");
      await profile.addSkill(keptSkill, "can_help");
    });

    await test.step("Удаляем первый навык", async () => {
      await profile.removeSkill(removedSkill);
    });

    await test.step("После перезагрузки удалённого навыка нет, второй на месте", async () => {
      await profile.page.reload();
      await expect(profile.skillChip(removedSkill)).toHaveCount(0);
      await expect(profile.skillChip(keptSkill)).toBeVisible();
    });
  });
});
