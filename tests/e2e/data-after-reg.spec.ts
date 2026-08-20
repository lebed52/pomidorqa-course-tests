import { test, expect, type Page } from '@playwright/test';
import { randomUUID } from 'node:crypto';


const TEST_PASSWORD = 'testpass123';

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
      changePersonalData: page.getByRole('button', { name: 'Сохранить' }),
      newSkillInput: page.getByLabel('Навык'),
      newSkillTypeSelect: page.getByLabel('Тип'),
      addSkillButton: page.getByRole('button', { name: 'Добавить' }),
      canHelpSkillsList: page.getByTestId('can-help-skills'),
    },
    slots: {
      title: page.getByRole('heading', { name: 'Мои слоты' }),
      dateInput: page.getByLabel('Дата'),
      startTimeInput: page.getByLabel('Время начала'),
      addSlotButton: page.getByRole('button', { name: 'Добавить слот' }),
      freeSlotsList: page.locator('[data-slot-status="free"]'),
    }
});

type TestUser = {
  name: string;
  email: string;
  password: string;
};

type TestSlot = {
  date: string;
  time: string;
};

function makeUser(): TestUser {
  const id = randomUUID();

  return {
    name: `Автотест ${id}`,
    email: `test-${id}@example.com`,
    password: TEST_PASSWORD,
  };
}

function createUniqueName(): string {
  return `Автотест ${randomUUID()}`;
}

function formatDate(date: Date): string {
  return [
    date.getFullYear(),
    String(date.getMonth() + 1).padStart(2, '0'),
    String(date.getDate()).padStart(2, '0'),
  ].join('-');
}

function getTestSlot(): TestSlot {
  const date = new Date();
  date.setDate(date.getDate() + 1);

  return {
    date: formatDate(date),
    time: '12:00',
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

test.beforeEach(async ({ page }) => {
  const user = makeUser();

  await registerUser(page, user);

  await openProfile(page);
})

test('Смена имени в профиле', async ({page}) => {
  const inputName = locators(page).profile.nameInput;
  const newName = createUniqueName();

  await test.step('Ввести новое имя в поле ввода', async () => {
    await inputName.fill(newName);
  })

  await test.step('Сохранить введенные данные', async () => {
    const responsePromise = page.waitForResponse(response => 
      response.url().includes('/pomidorqa/profile') &&
      response.request().method() === 'POST' &&
      response.status() === 200
    );
    await locators(page).profile.changePersonalData.click();
    await responsePromise;
  })

  await test.step('Перезагрузить страницу', async () => {
    await page.reload();
  })

  await test.step('Проверить, что отображаются новые данные', async () => {
    await expect(inputName).toHaveValue(newName);
  })

})

test('Добавление навыка', async ({page}) => {
  const skillTag = `Playwright-demo-${randomUUID()}`;
  const profile = locators(page).profile;
  
  await test.step('Добавить навык', async () => {
    await profile.newSkillInput.fill(skillTag);
    await profile.newSkillTypeSelect.selectOption("can_help");
    await profile.addSkillButton.click();
  })

  await test.step('Проверить, что навык отобразился в списке навыков', async () => {
    await expect(profile.canHelpSkillsList).toContainText(skillTag);
  })
  
})

test('Добавление слота', async ({page}) => {
  const slot = getTestSlot();
  const slots = locators(page).slots;

  await test.step('Перейти на страницу со слотами', async () => {
    await page.goto('/pomidorqa/profile/slots');
    await expect(slots.title).toBeVisible();
  })

  await test.step('Добавить новый слот', async () => {
    await slots.dateInput.fill(slot.date);
    await slots.startTimeInput.fill(slot.time);
    await slots.addSlotButton.click();
  })

  await test.step('Проверить, что слот отобразился в списке слотов', async () => {
    await expect(slots.freeSlotsList.first()).toBeVisible();
  })

})