import { test, expect } from "@playwright/test";
import { makeUser, registerUserViaApi, deleteCurrentTestUser } from "../helpers/user";
import { ProfilePage } from "../pages/ProfilePage";

test.describe("Профиль: навык не дублируется при повторном добавлении", () => {
  test.beforeEach(async ({ page }) => {
    const user = makeUser("skill-dup", crypto.randomUUID().slice(0, 10));
    await registerUserViaApi(page, user);
  });

  test.afterEach(async ({ page }) => {
    await deleteCurrentTestUser(page);
  });

  test("Повторно добавленный навык не создаёт дубликат в списке", async ({ page }) => {
    const profilePage = new ProfilePage(page);
    const skillTag = `Duplicate-${crypto.randomUUID().slice(0, 10)}`;

    await profilePage.goto();

    await test.step("Добавляем навык первый раз", async () => {
      await profilePage.addSkill(skillTag, "can_help");
    });

    await test.step("Проверяем, что навык появился в блоке «могу помочь»", async () => {
      await expect(profilePage.canHelpSkills).toContainText(skillTag);
    });

    await test.step("Пытаемся добавить тот же навык второй раз", async () => {
      await profilePage.addSkill(skillTag, "can_help");
    });

    await test.step("Проверяем, что в списке только одно вхождение навыка", async () => {
      await expect(profilePage.skillChip(skillTag, "can_help")).toHaveCount(1);
    });
  });
});
