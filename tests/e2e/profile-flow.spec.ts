import { test, expect, type Page } from '@playwright/test';


const locators = (page: Page) => ({
    register: {
      nameInput: page.getByRole('textbox', { name: 'Имя' }),
      emailInput: page.getByRole('textbox', { name: 'Email' }),
      passwordInput: page.getByRole('textbox', { name: 'Пароль' }),
      submit: page.getByRole('button', { name: 'Зарегистрироваться' }),
    },
    profile: {
      title: page.getByRole('heading', { name: 'Твой профиль' }),
      nameInput: page.getByLabel('Имя'),
      telegramInput: page.getByLabel('Telegram'),
      timezoneSelect: page.getByLabel('Часовой пояс'),
      aboutInput: page.getByLabel('О себе'),
      changePersonalData: page.getByRole('button', { name: 'Сохранить' }),
      newSkillInput: page.getByLabel('Навык'),
      newSkillTypeSelect: page.getByLabel('Тип'),
      addSkillButton: page.getByRole('button', { name: 'Добавить' }),
      canHelpSkillsList: page.getByTestId('can-help-skills'),
    }
});

type TestUser = {
  name: string;
  email: string;
  password: string;
};

function makeUser(): TestUser {
  const id = Date.now();

  return {
    name: `Автотест ${id}`,
    email: `test-${id}@example.com`,
    password: 'testpass123',
  };
}

async function registerUser(page: Page, user: TestUser) {
  const register = locators(page).register;

  await page.goto("/pomidorqa/auth/register");
  await register.nameInput.fill(user.name);
  await register.emailInput.fill(user.email);
  await register.passwordInput.fill(user.password);
  await register.submit.click();
  await expect(page).toHaveURL(/\/pomidorqa\/?$/);
}

async function openProfile(page: Page) {
  await page.goto("/pomidorqa/profile");
  await expect(page).toHaveURL(/\/pomidorqa\/profile\/?$/);
  await expect(locators(page).profile.title).toBeVisible();
}

async function savePersonalData(page: Page) {
  await test.step('Сохранить введенные данные', async () => {
    await locators(page).profile.changePersonalData.click();
  })
}

test.describe('Редактирование данных в профиле', () => {

  test.beforeEach(async ({ page }) => {
    const user = makeUser();
  
    await registerUser(page, user);
  
    await openProfile(page);
  })

  test('Изменить имя', async ({page}) => {
    const newName = `Автотест ${Date.now()}`;
  
    await test.step('Ввести новое имя', async () => {
      await locators(page).profile.nameInput.fill(newName);
    })
  
    await savePersonalData(page);
    
    await test.step('Проверить сохраненное имя', async () => {
      await expect(locators(page).profile.nameInput).toHaveValue(newName);
    })
  })

  test('Изменить telegram', async ({page}) => {
    const newTG = `@telegram_${Date.now()}`;
  
    await test.step('Ввести новый telegram', async () => {
      await locators(page).profile.telegramInput.fill(newTG);
    })
  
    await savePersonalData(page);
    
    await test.step('Проверить сохраненный telegram', async () => {
      await expect(locators(page).profile.telegramInput).toHaveValue(newTG);
    })
  })

  test('Изменить часовой пояс', async ({page}) => {
    const TIMEZONE = 'Asia/Vladivostok';

    await test.step('Выбрать новый часовой пояс', async () => {
      await locators(page).profile.timezoneSelect.selectOption(TIMEZONE);
    })

    await savePersonalData(page);
    
    await test.step('Проверить сохраненный часовой пояс', async () => {
      await expect(locators(page).profile.timezoneSelect).toHaveValue(TIMEZONE);
    })
  })

  test('Изменить "О себе"', async ({page}) => {
    const newAbout = `О себе ${Date.now()}`;

    await test.step('Ввести новое описание', async () => {
      await locators(page).profile.aboutInput.fill(newAbout);
    })

    await savePersonalData(page);

    await test.step('Проверить сохраненное описание', async () => {
      await expect(locators(page).profile.aboutInput).toHaveValue(newAbout);
    })
  })

  test('Добавить навык', async ({page}) => {
    const skillTag = `Playwright-demo-${Date.now()}`;
    
    await test.step('Добавить навык', async () => {
      await locators(page).profile.newSkillInput.fill(skillTag);
      await locators(page).profile.newSkillTypeSelect.selectOption("can_help");
      await locators(page).profile.addSkillButton.click();
    })
  
    await test.step('Проверить отображение нового навыка в списке', async () => {
      await expect(locators(page).profile.canHelpSkillsList).toContainText(skillTag);
    })
  })

});
