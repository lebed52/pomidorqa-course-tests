import { test, expect, type Page } from "@playwright/test";

type TestUser = {
  name: string;
  email: string;
  password: string;
};

function makeUser(role: string, runId: number): TestUser {
  return {
    name: `${role}-${runId}`,
    email: `${role}-${runId}@example.com`,
    password: `pw-${runId}`,
  };
}

async function registerUser(page: Page, user: TestUser) {
  await page.goto("/pomidorqa/auth/register");
  await page.getByLabel("Имя").fill(user.name);
  await page.getByLabel("Email").fill(user.email);
  await page.getByLabel("Пароль").fill(user.password);
  await page.getByRole("button", { name: "Зарегистрироваться" }).click();
  await expect(page).toHaveURL(/\/pomidorqa\/?$/);
}

//Локаторы
const skillInput = (page: Page) => page.locator("#pomidorqa-profile-skill-input");
const skillTypeSelect = (page: Page) => page.locator("#pomidorqa-profile-skill-type");
const skillSubmit = (page: Page) => page.getByRole("button", { name: "Добавить" });
const canHelpSkills = (page: Page) => page.getByTestId("can-help-skills");
const canHelpSkillChip = (page: Page, skillTag: string) =>
  canHelpSkills(page).getByRole("button", { name: skillTag });
async function addCanHelpSkill(page: Page, skillTag: string) {
  await skillInput(page).fill(skillTag);
  await skillTypeSelect(page).selectOption("can_help");
  await skillSubmit(page).click();
}

test.describe("Act Practice", () => {
  let user: TestUser;

  test.beforeEach(async ({ page }) => {
    const runId = Date.now();
    user = makeUser("act-practice", runId);
    await registerUser(page, user);
    await page.goto("/pomidorqa/profile");
  });

  test("Имя: изменить и сохранить", async ({ page }) => {
    const newName = `${user.name}-upd`;
    await page.getByLabel("Имя").fill(newName);
    await page.getByRole("button", { name: "Сохранить" }).click();
    await expect(page.getByLabel("Имя")).toHaveValue(newName);
  });

  test("Часовой пояс: выбрать и сохранить", async ({ page }) => {
    const timezone = "Asia/Yekaterinburg";
    await page.getByLabel("Часовой пояс").selectOption(timezone);
    await page.getByRole("button", { name: "Сохранить" }).click();
    await expect(page.getByLabel("Часовой пояс")).toHaveValue(timezone);
  });

  test("Telegram: заполнить и сохранить", async ({ page }) => {
    const telegram = `@act${Date.now()}`;
    await page.getByLabel("Telegram").fill(telegram);
    await page.getByRole("button", { name: "Сохранить" }).click();
    await expect(page.getByLabel("Telegram")).toHaveValue(telegram);
  });

  test("О себе: заполнить и сохранить", async ({ page }) => {
    const bio = `Bio for ${user.name}`;
    await page.getByLabel("О себе").fill(bio);
    await page.getByRole("button", { name: "Сохранить" }).click();
    await expect(page.getByLabel("О себе")).toHaveValue(bio);
  });

  test("Навык: добавить «могу помочь»", async ({ page }) => {
    const skillTag = `skill-${Date.now()}`;
    await skillInput(page).fill(skillTag);
    await skillTypeSelect(page).selectOption("can_help");
    await skillSubmit(page).click();
    await expect(canHelpSkills(page)).toContainText(skillTag);
  });

  test("Навык: плашка отображается после добавления", async ({ page }) => {
    const skillTag = `chip-${Date.now()}`;
    await addCanHelpSkill(page, skillTag);
    await expect(canHelpSkillChip(page, skillTag)).toBeVisible();
    await expect(canHelpSkillChip(page, skillTag)).toHaveCount(1);
  });

  test("Негатив: множественный клик по «Добавить» не создаёт дубль навыка", async ({ page }) => {
    const skillTag = `multi-${Date.now()}`;
    await skillInput(page).fill(skillTag);
    await skillTypeSelect(page).selectOption("can_help");
    await skillSubmit(page).dblclick();
    await expect(canHelpSkillChip(page, skillTag)).toHaveCount(1);
  });

  test("Негатив: после удаления навык больше не отображается", async ({ page }) => {
    const skillTag = `del-${Date.now()}`;
    await addCanHelpSkill(page, skillTag);
    const chip = canHelpSkillChip(page, skillTag);
    await expect(chip).toBeVisible();
    await chip.click();
    await expect(chip).not.toBeVisible();
  });

  test("Негатив: повторное добавление того же навыка не создаёт дубль", async ({ page }) => {
    const skillTag = `dup-${Date.now()}`;
    await addCanHelpSkill(page, skillTag);
    await expect(canHelpSkillChip(page, skillTag)).toHaveCount(1);
    await addCanHelpSkill(page, skillTag);
    await expect(canHelpSkillChip(page, skillTag)).toHaveCount(1);
  });
});
