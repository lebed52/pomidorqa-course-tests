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
  profileTimezoneSelect: page.locator('select[name="timezone"]'),
  profileSkillTag: (text: string) => page.getByRole('button').filter({ hasText: text }),
  profileSkillRemoveBtn: page.getByTestId(/^ProfileSkill-remove-/),
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
  let hostLoc: ReturnType<typeof locators>;
  let skillTag: string;
  let host: TestUser;

  test.beforeEach(async ({ page }) => {
    test.setTimeout(90_000);
    const runId = Date.now();
    skillTag = `Playwright-demo-${runId}`;
    host = makeUser("host", runId);
    
    hostLoc = locators(page);
    
    await test.step("Хост: регистрируется в PomidorQA", async () => {
      await registerUser(page, host);
    });
    await test.step("Хост: переходит на страницу профиля", async () => {
      await page.goto("/pomidorqa/profile", { waitUntil: "domcontentloaded" });
    });
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
    await expect(hostLoc.profileSkillTag(skillTag)).toBeVisible();
  });

  test("Негативный: сохранение профиля с пустым полем Имя", async ({ page }) => {
    await hostLoc.profileNameInput.clear();
    await hostLoc.profileNameSubmit.click();
    await expect(page).not.toHaveURL(/\/pomidorqa\/auth/);
    const isNameValid = await hostLoc.profileNameInput.evaluate((el) => el.checkValidity());
    expect(isNameValid).toBe(false);
  });

  test("Позитивный: одновременное редактирование Telegram, био и таймзоны", async () => {
    const updatedTg = "@playwright_expert";
    const updatedBio = "Автоматизатор. Пишу поддерживаемые e2e-тесты.";
    const updatedTimezone = "Europe/Kaliningrad";
    await hostLoc.profileTelegramInput.fill(updatedTg);
    await hostLoc.profileBioInput.fill(updatedBio);
    await hostLoc.profileTimezoneSelect.selectOption(updatedTimezone);
    await hostLoc.profileNameSubmit.click();
    await expect(hostLoc.profileTelegramInput).toHaveValue(updatedTg);
    await expect(hostLoc.profileBioInput).toHaveValue(updatedBio);
    await expect(hostLoc.profileTimezoneSelect).toHaveValue(updatedTimezone);
  });

  test("Позитивный: удаление ранее добавленного навыка из списка", async () => {
    await hostLoc.profileAddSkillInput.fill(skillTag);
    await hostLoc.profileAddSkillTypeSelect.selectOption("can_help");
    await hostLoc.profileAddSkillSubmit.click();
    await expect(hostLoc.profileSkillRemoveBtn).toBeVisible();
    await hostLoc.profileSkillRemoveBtn.click();
    await expect(hostLoc.profileSkillRemoveBtn).toHaveCount(0);
  });
});
