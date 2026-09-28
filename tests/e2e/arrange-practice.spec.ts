import { test, expect, type Page } from "@playwright/test";
import { TestUser, makeUser, registerUser } from "../helpers/user";


  const profileNameInput = (page: Page) => page.getByLabel("Имя");
  const profileSaveButton = (page: Page) => page.getByRole("button", { name: "Сохранить" });
  
  const skillInput = (page: Page) => page.locator("#pomidorqa-profile-skill-input");
  const skillTypeSelect = (page: Page) => page.locator("#pomidorqa-profile-skill-type");
  const addSkillButton = (page: Page) => page.getByRole("button", { name: "Добавить" });
  const canHelpSkills = (page: Page) => page.getByTestId("can-help-skills");

  const slotsDateInput = (page: Page) => page.locator("#pomidorqa-slots-date");
  const slotsTimeInput = (page: Page) => page.locator("#pomidorqa-slots-time");
  const slotsAddSubmit = (page: Page) => page.getByRole("button", { name: "Добавить слот" });
  const slotsCard = (page: Page) => page.locator("[data-slot-id]");
  
 
  test.describe("Проведение практики", () => {
    let user: TestUser;

    test.beforeEach(async ({ page }) => {
        const runId = Date.now();
        user = makeUser("Jango", runId);
        await registerUser(page, user);
        await page.goto("/pomidorqa/profile");
        await expect(page).toHaveURL(/\/pomidorqa\/profile/);
    });

    test("Смена имени", async ({ page }) => {
        const newName = "Jango Fett";
        await profileNameInput(page).fill(newName);
        await profileSaveButton(page).click();
        await expect(profileNameInput(page)).toHaveValue(newName);
    });

    test("Добавление навыка", async ({ page }) => {
        const skillName = "Playwright";
        await skillInput(page).fill(skillName);
        await skillTypeSelect(page).selectOption("can_help");
        await addSkillButton(page).click();
        await expect(canHelpSkills(page)).toContainText(skillName);
    });

    test("Добавление свободного слота", async ({ page }) => {
        await page.goto("/pomidorqa/profile/slots");
        const tomorrow = new Date(Date.now() + 24 * 60 * 60 * 1000);
        const date = tomorrow.toISOString().slice(0, 10);
        await slotsDateInput(page).fill(date);
        await slotsTimeInput(page).fill("12:00");
        await slotsAddSubmit(page).click();
        await expect(slotsCard(page).first()).toBeVisible();
    });
});
