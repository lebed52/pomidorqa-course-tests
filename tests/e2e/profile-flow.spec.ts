import { test, expect, type Page } from "@playwright/test";

type TestUser = {
  name: string;
  email: string;
  password: string;
};

function makeUser(role: string, runId: number): TestUser {
  return {
    name: `${role} Автотест`,
    email: `${role}-${runId}@example.com`,
    password: "testpass123",
  };
}

const locForRegisterName = (page: Page) => page.locator('#pomidorqa-register-name');
const locForRegisterEmail = (page: Page) => page.locator('#pomidorqa-register-email');
const locForRegisterPassword = (page: Page) => page.locator('#pomidorqa-register-password');
const forButtonSubmitRegister = (page: Page) => page.getByRole('button', { name: 'Зарегистрироваться' });

const locForChangeProfileName = (page: Page) => page.getByLabel('Имя');
const locForSubmitProfileChange = (page: Page) => page.getByRole('button', { name: 'Сохранить' });
const locForProfileTelegram = (page: Page) => page.getByLabel('Telegram');
const locForChooseTimezone = (page: Page) => page.getByLabel('Часовой пояс');
const locForFillAboutYourself = (page: Page) => page.getByLabel('О себе');

const locForInputProfileSkill = (page: Page) => page.getByLabel('Навык');
const locForAddSkillTypeSelect = (page: Page) => page.locator('#pomidorqa-profile-skill-type');
const locForButtonSubmitAddSkill = (page: Page) => page.getByRole('button', { name: 'Добавить' });
const locForCanHelpSkills = (page: Page) => page.getByTestId('can-help-skills');
const locForWantToLearnSkills = (page: Page) => page.getByTestId('want_to_learn');
const locForAnyButtonCanHelpSkills = (page: Page) => page.locator('//div[@data-skills="can_help"]//button');
const locForAnyButtonToLearnSkills = (page: Page) => page.locator('//div[@data-skills="want_to_learn"]//button');

const locForLogOutFromProfile = (page: Page) => page.getByRole('button', { name: 'Выйти' });


async function registerUser(page: Page, user: TestUser) {
  await page.goto("/pomidorqa/auth/register");
  await locForRegisterName(page).fill(user.name);
  await locForRegisterEmail(page).fill(user.email);
  await locForRegisterPassword(page).fill(user.password);
  await forButtonSubmitRegister(page).click();
  await expect(page).toHaveURL(/\/pomidorqa\/?$/);
}

test.describe("тесты на профиле для ДЗ 9 - добавлены новые тесты в конце", () => {
  let user: TestUser;
  let skillTag: string;

  test.beforeEach(async ({ page }) => {
    // Arrange:
    const runId = Date.now();
    skillTag = `Playwright-${runId}`;
    user = makeUser('test1', runId); 
    await registerUser(page, user); 
    await page.goto("/pomidorqa/profile"); 
  });

  /*  test.afterEach(async ({ page }) => {
     await locForProfileTelegram(page).clear();
     await locForFillAboutYourself(page).clear();
     await locForSubmitProfileChange(page).click();
     //убираем "Могу помочь с", если оно непустое
     const count1 = await locForAnyButtonCanHelpSkills(page).count();
     if (await locForCanHelpSkills(page).isVisible()) {
      for (let i=0; i < count1; i++) {
      await locForAnyButtonCanHelpSkills(page).nth(0).click();
      // дипсик тут советует поставить await page.waitForTimeout(100) или 
      // await expect(locForAnyButtonCanHelpSkills(page).nth(0)).not.toBeVisible(); пока убрала
      }
     }
     //убираем "Хочу разобрать", если оно непустое
     const count2 = await locForAnyButtonToLearnSkills(page).count();
     if (await locForWantToLearnSkills(page).isVisible()) {
      for (let i=0; i < count2; i++) {
      await locForAnyButtonCanHelpSkills(page).nth(0).click();
      // дипсик тут советует поставить await page.waitForTimeout(100) 
      // или await expect(locForAnyButtonCanHelpSkills(page).nth(0)).not.toBeVisible(); пока убрала
      }
     }     

  }); */
  // Тут afterEach как будто лишнее, т.к. перед каждым тестом создается новый пользователь, у которого ничего не заполнено
  // и оно ломает последний тест, где переход на др.страницу

  test("смена имени в профиле", async ({ page }) => {
    await locForChangeProfileName(page).fill(user.name+'_changed');
    await locForSubmitProfileChange(page).click();
    await expect(locForChangeProfileName(page)).toHaveValue(user.name+'_changed');
  });

  test("заполнение ника в telegram", async ({ page }) => {
    const role = user.name.split(' ')[0];
    await locForProfileTelegram(page).fill('@'+role);
    await locForSubmitProfileChange(page).click();
    await expect(locForProfileTelegram(page)).toHaveValue('@'+role);
  });

  test("выбор часового пояса", async ({ page }) => {
    await locForChooseTimezone(page).selectOption({ label: 'Asia/Novosibirsk' });
    await locForSubmitProfileChange(page).click();
    await expect(locForChooseTimezone(page)).toHaveValue('Asia/Novosibirsk');
  });

  test("заполнение О себе", async ({ page }) => {
    await locForFillAboutYourself(page).fill('Изучаю автотесты на практике. Могу рассказать про '+skillTag);
    await locForSubmitProfileChange(page).click();
    await expect(locForFillAboutYourself(page)).toHaveValue('Изучаю автотесты на практике. Могу рассказать про '+skillTag);
  });

  test("добавление навыка", async ({ page }) => {
    await locForInputProfileSkill(page).fill(skillTag);
    await locForAddSkillTypeSelect(page).selectOption("can_help");
    await locForButtonSubmitAddSkill(page).click();
    await expect(locForCanHelpSkills(page)).toContainText(skillTag);
  });

  test("добавление двух навыков", async ({ page }) => {
    const someSkill = skillTag.split('-')[0];
    await locForInputProfileSkill(page).fill('1_'+skillTag);
    await locForAddSkillTypeSelect(page).selectOption("want_to_learn");
    await locForButtonSubmitAddSkill(page).click();
    await page.reload();
    await expect(locForAnyButtonToLearnSkills(page).filter({ hasText: someSkill })).toHaveCount(1);
    await locForInputProfileSkill(page).fill('2_'+skillTag);
    await locForAddSkillTypeSelect(page).selectOption("want_to_learn");
    await locForButtonSubmitAddSkill(page).click();
    await page.reload();
    await expect(locForAnyButtonToLearnSkills(page).filter({ hasText: someSkill })).toHaveCount(2);
  });

  test("удаление одного из навыков после добавления двух", async ({ page }) => {
    const firstCount = await locForAnyButtonCanHelpSkills(page).count();
    await locForInputProfileSkill(page).fill('1_'+skillTag);
    await locForAddSkillTypeSelect(page).selectOption("can_help");
    await locForButtonSubmitAddSkill(page).click();
    await page.reload();
    await locForInputProfileSkill(page).fill('2_'+skillTag);
    await locForAddSkillTypeSelect(page).selectOption("can_help");
    await locForButtonSubmitAddSkill(page).click();
    await page.reload();
    await locForAnyButtonCanHelpSkills(page).first().click();
    await page.reload();
    await expect(locForAnyButtonCanHelpSkills(page)).toHaveCount(firstCount+1);
  });

  test("удаление единственного навыка", async ({ page }) => {
    await locForInputProfileSkill(page).fill(skillTag);
    await locForAddSkillTypeSelect(page).selectOption("can_help");
    await locForButtonSubmitAddSkill(page).click();
    await locForAnyButtonCanHelpSkills(page).first().click();
    await expect(locForCanHelpSkills(page)).not.toBeVisible();
  }); 

  test("удаление имени в профиле", async ({ page }) => {
    await locForChangeProfileName(page).clear();
    await locForSubmitProfileChange(page).click();
    await expect(locForChangeProfileName(page)).toBeEmpty();
    await expect(locForChangeProfileName(page)).toBeFocused();
    //await expect(page.getByText(/Заполните|fill/i)).toBeVisible({ timeout: 10000 }); - не нашла, как посмотреть локатор, пока убрала
  }); 

  test("кнопка выхода в профиле", async ({ page }) => {
    await locForLogOutFromProfile(page).click();
    await expect(page).toHaveURL(/\/pomidorqa\/?$/);
  });  
 


});