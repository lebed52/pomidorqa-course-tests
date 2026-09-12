import { test, expect } from "@playwright/test";
import { makeUser, registerUser } from "../helpers/user";
import { ProfilePage } from "../pages/ProfilePage";

test.describe("Профиль: валидация навыка с пробелами и пустым значением", () => {
  test.beforeEach(async ({ page }) => {
    const user = makeUser("skill-space", crypto.randomUUID().slice(0, 8));
    await registerUser(page, user);
  });

  test("сценарий с пробелами не создаёт пустой навык", async ({ page }) => {
    const profilePage = new ProfilePage(page);
    const spacedTag = `   ${crypto.randomUUID().slice(0, 8)}   `;

    await profilePage.goto();

    await test.step("Пробуем добавить навык, состоящий только из пробелов", async () => {
      await profilePage.skillInput.fill(spacedTag);
      await profilePage.skillTypeSelect.selectOption("can_help");
      await profilePage.addSkillButton.click();
    });

    await test.step("Проверяем, что навык не создался после валидации", async () => {
      await expect(profilePage.skillChips).toHaveCount(0);
      await expect(profilePage.canHelpSkills).toBeHidden();
    });
  });
});
