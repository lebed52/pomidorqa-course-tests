import { test, expect, type Page } from "@playwright/test";

type TestUser = {
  name: string;
  newName: string;
  email: string;
  password: string;
  telegram: string;
  bio: string;
  timezone: string;
};

function makeUser(role: string, runId: number): TestUser {
  const baseName = `${role} Автотест`;
  return {
    name: baseName,
    newName: `${baseName} Jr.`,
    email: `${role}-${runId}@example.com`,
    password: "testpass123",
    telegram: `@${role}_${runId}`,
    bio: `Тест ${role} ${runId}`,
    timezone: "Asia/Irkutsk"
  };
}

const locators = (page: Page) => ({
  registerNameInput: page.getByLabel('Имя'),
  registerEmailInput: page.getByLabel('Email'),
  registerPasswordInput: page.getByLabel('Пароль'),
  registerSubmit: page.getByRole('button', { name: 'Зарегистрироваться' }),
  profileNameInput: page.getByLabel('Имя'),
  profileNameSubmit: page.getByRole('button', { name: 'Сохранить' }),
  profileTelegramInput: page.locator('input[name="telegram"]'),
  profileBioInput: page.locator('textarea[name="bio"]'),
  profileAddSkillInput: page.getByPlaceholder('Например: Playwright, SQL, собеседования'),
  profileAddSkillTypeSelect: page.locator('#pomidorqa-profile-skill-type'),
  profileAddSkillSubmit: page.getByRole('button', { name: 'Добавить' }),
  profileCanHelpSkills: page.locator('//button[@data-skill-tag]'),
  profileTimezoneSelect: page.locator('select[name="timezone"]'),
});

async function registerUser(page: Page, user: TestUser) {
  const loc = locators(page);
  await page.goto("/pomidorqa/auth/register", { waitUntil: "domcontentloaded" });
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

    await test.step("Хост: переходит на страницу профиля", async () => {
      await hostPage.goto("/pomidorqa/profile", { waitUntil: "domcontentloaded" });
    });
  });

  test.afterEach(async () => {
    await hostPage.context().close();
  });

  test("Смена имени в профиле", async () => {
    await hostLoc.profileNameInput.fill(host.newName);
    await hostLoc.profileNameSubmit.click();
    await expect(hostLoc.profileNameInput).toHaveValue(host.newName);
  });

  test("Добавление tg", async () => {
    await hostLoc.profileTelegramInput.fill(host.telegram);
    await hostLoc.profileNameSubmit.click();
    await expect(hostLoc.profileTelegramInput).toHaveValue(host.telegram);
  });
  
  test("Смена часового пояса", async () => {
    await hostLoc.profileTimezoneSelect.selectOption(host.timezone);
    await hostLoc.profileNameSubmit.click();
    await expect(hostLoc.profileTimezoneSelect).toHaveValue(host.timezone);
  });

  test("Добавление инфо О себе", async () => {
    await hostLoc.profileBioInput.fill(host.bio);
    await hostLoc.profileNameSubmit.click();
    await expect(hostLoc.profileBioInput).toHaveValue(host.bio);
  });

  test("Добавление навыка", async () => {
    await hostLoc.profileAddSkillInput.fill(skillTag);
    await hostLoc.profileAddSkillTypeSelect.selectOption("can_help");
    await hostLoc.profileAddSkillSubmit.click();
    await expect(hostLoc.profileCanHelpSkills).toContainText(skillTag);
  });
});
