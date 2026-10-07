import { test, expect, type Page } from "@playwright/test";

type TestUser = {
    name: string;
    newName: string;
    email: string;
    password: string;
  };
  
  function makeUser(role: string, runId: number): TestUser {
    return {
      name: `${role} Автотест`,
      newName: "newname",
      email: `${role}-${runId}@example.com`,
      password: "testpass123",
    };
  }

const locators = (page: Page) => ({
    registerNameInput: page.getByLabel('Имя'),
    registerEmailInput: page.getByLabel('Email'),
    registerPasswordInput: page.getByLabel('Пароль'),
    registerSubmit: page.getByRole('button',{name:'Зарегистрироваться'}),
    profileNameInput: page.getByLabel('Имя'),
    profileNameSubmit: page.getByRole('button',{name:'Сохранить'}),
    profileAddSkillInput: page.getByPlaceholder('Например: Playwright, SQL, собеседования'),
    profileAddSkillTypeSelect: page.locator('#pomidorqa-profile-skill-type'),
    profileAddSkillSubmit: page.getByRole('button',{name:'Добавить'}),
    profileCanHelpSkills: page.locator('//button[@data-skill-tag]'),
    slotsDateInput: page.locator('#pomidorqa-slots-date'),
    slotsTimeInput: page.locator('#pomidorqa-slots-time'),
    slotsAddSubmit: page.getByRole('button',{name:'Добавить слот'}),
    slotsCard: page.locator('[data-slot-status="free"]'),
});

async function registerUser(page: Page, user: TestUser) {
  const loc = locators(page);
  await page.goto("/pomidorqa/auth/register");
  await loc.registerNameInput.fill(user.name);
  await loc.registerEmailInput.fill(user.email);
  await loc.registerPasswordInput.fill(user.password);
  await loc.registerSubmit.click();
  await expect(page).toHaveURL(/\/pomidorqa\/?$/);
}

test.describe("свой мир на каждый тест", () => {
    let hostPage: Page;
    let hostLoc: ReturnType<typeof locators>;
    let skillTag: string;
    let host: TestUser;
  
    test.beforeEach(async ({ browser }) => {
        test.setTimeout(90_000);
        const runId = Date.now();
        skillTag = `Playwright-demo-${runId}`;
        host = makeUser("host", runId);
        const hostContext = await browser.newContext();
        hostPage = await hostContext.newPage();
        hostLoc = locators(hostPage);
      
        await test.step("Хост: регистрируется в PomidorQA", async () => {
          await registerUser(hostPage, host);
        });
    });

    test.afterEach(async () => {
        await hostPage.context().close();
    });
    
test("Смена имени в профиле", async () => {

  await hostPage.goto("/pomidorqa/profile");
  await hostLoc.profileNameInput.fill(host.newName);
  await hostLoc.profileNameSubmit.click();
  await expect(hostLoc.profileNameInput).toHaveValue(host.newName);
});

test("Добавление навыка", async () => {

  await hostPage.goto("/pomidorqa/profile");
  await hostLoc.profileAddSkillInput.fill(skillTag);
  await hostLoc.profileAddSkillTypeSelect.selectOption("can_help");
  await hostLoc.profileAddSkillSubmit.click();
  await expect(hostLoc.profileCanHelpSkills).toContainText(skillTag);
});

test("Добавление слота", async () => {
  await hostPage.goto("/pomidorqa/profile/slots");
  const tomorrow = new Date(Date.now() + 24 * 60 * 60 * 1000);
  const date = tomorrow.toISOString().slice(0, 10);
  await hostLoc.slotsDateInput.fill(date);
  await hostLoc.slotsTimeInput.fill("12:00");
  await hostLoc.slotsAddSubmit.click();
  await expect(hostLoc.slotsCard.first()).toBeVisible();
});
});
