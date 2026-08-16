import { test, expect, type Page } from "@playwright/test";

function locators(page: Page) {
  return {
    // getByTestId
    upcomingSection: page.getByTestId('PomidorqaBookings-upcoming-section'),
    bookingCardName: page.getByTestId('PomidorqaBookings-card-name'),
    
    // getByRole
    registerButton: page.getByRole("button", { name: "Зарегистрироваться" }),
    addSkillButton: page.getByRole("button", { name: "Добавить навык" }),
    addSlotButton: page.getByRole("button", { name: "Добавить слот" }),
    searchButton: page.getByRole("button", { name: "Найти" }),
    confirmButton: page.getByRole("button", { name: "Подтвердить" }),
    skillTypeSelect: page.getByRole("combobox", { name: "Тип навыка" }),
    dialog: page.getByRole("dialog"),
    
    // getByLabel
    nameInput: page.getByLabel("Имя"),
    emailInput: page.getByLabel("Email"),
    passwordInput: page.getByLabel("Пароль"),
    skillInput: page.getByLabel("Навык"),
    dateInput: page.getByLabel("Дата"),
    timeInput: page.getByLabel("Время начала"),
    
    // getByText
    skillTagText: (tag: string) => page.getByText(tag),
    hostNameText: (name: string) => page.getByText(name),
    
    // CSS селекторы
    catalogFilter: page.locator("#pomidorqa-catalog-skill-filter"),
    personCard: page.locator("[data-testid='person-card']"),
    canHelpSkills: page.locator("[data-testid='can-help-skills']"),
    upcomingMeetings: page.locator("[data-testid='upcoming-meetings']"),
    
    // XPath (относительный)
    findButtonXPath: page.locator("//button[normalize-space()='Найти']"),
    
    // Сложные селекторы с filter
    hostCard: (name: string) => page
      .getByTestId('person-card')
      .filter({ hasText: name }),
    
    // first() и nth()
    dayChip: page.getByRole("button", { name: /\d{2}\.\d{2}/ }).first(),
    timeChip: page.getByRole("button", { name: /^\d{2}:\d{2}$/ }).first(),
    slotList: page.getByRole("list").first(),
  };
}

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

async function registerUser(page: Page, user: TestUser) {
  const l = locators(page);
  await page.goto("/pomidorqa/auth/register");
  await l.nameInput.fill(user.name);
  await l.emailInput.fill(user.email);
  await l.passwordInput.fill(user.password);
  await l.registerButton.click();
  await expect(page).toHaveURL(/\/pomidorqa\/?$/);
}

test("основной путь + гонка за слот: регистрация → навык → слот → поиск в каталоге → бронирование → «Мои встречи» у обоих → второй гость видит ошибку", async ({
  browser,
}) => {
  const runId = Date.now();
  const skillTag = `Playwright-demo-${runId}`;
  const host = makeUser("host", runId);
  const guest = makeUser("guest", runId);
  const guest2 = makeUser("guest2", runId);

  // Три независимых аккаунта = три независимых браузерных контекста
  const hostContext = await browser.newContext();
  const guestContext = await browser.newContext();
  const guest2Context = await browser.newContext();
  
  const hostPage = await hostContext.newPage();
  const guestPage = await guestContext.newPage();
  const guest2Page = await guest2Context.newPage();

  // Получаем локаторы для каждой страницы
  const hostL = locators(hostPage);
  const guestL = locators(guestPage);
  const guest2L = locators(guest2Page);

  // ШАГ 1: Хост регистрируется 
  await test.step("Хост: регистрируется в PomidorQA", async () => {
    await registerUser(hostPage, host);
  });

  //  ШАГ 2: Хост добавляет навык 
  await test.step('Хост: добавляет навык «могу помочь» в профиле', async () => {
    await hostPage.goto("/pomidorqa/profile");
    await hostL.skillInput.fill(skillTag);
    await hostL.skillTypeSelect.selectOption("can_help");
    await hostL.addSkillButton.click();
    await expect(hostL.skillTagText(skillTag)).toBeVisible();
  });

  //  ШАГ 3: Хост добавляет слот 
  await test.step("Хост: добавляет свободный слот на завтра", async () => {
    await hostPage.goto("/pomidorqa/profile/slots");
    const tomorrow = new Date(Date.now() + 24 * 60 * 60 * 1000);
    const date = tomorrow.toISOString().slice(0, 10);
    await hostL.dateInput.fill(date);
    await hostL.timeInput.fill("12:00");
    await hostL.addSlotButton.click();
    await expect(hostL.slotList.getByText(date)).toBeVisible();
  });

  //  ШАГ 4: Гость регистрируется 
  await test.step("Гость: регистрируется отдельным аккаунтом", async () => {
    await registerUser(guestPage, guest);
  });

  // ШАГ 5: Гость ищет хоста 
  await test.step("Гость: ищет хоста в каталоге по навыку", async () => {
    await guestL.skillInput.fill(skillTag);
    await guestL.searchButton.click();
    await expect(guestL.hostNameText(host.name)).toBeVisible();
  });

  //  ШАГ 6: Гость открывает карточку хоста 
  await test.step("Гость: открывает карточку хоста", async () => {
    const card = guestL.hostNameText(host.name);
    await card.click();
  });

  // ШАГ 7: Гость выбирает слот 
  await test.step("Гость: кликает по дню и времени в календаре слотов", async () => {
    await expect(async () => {
      const dayChip = guestPage.getByRole("button", { name: /\d{2}\.\d{2}/ }).first();
      if (!(await dayChip.isVisible().catch(() => false))) {
        await guestPage.reload();
      }
      await expect(dayChip).toBeVisible();
    }).toPass({ timeout: 10_000 });

    const dayChip = guestPage.getByRole("button", { name: /\d{2}\.\d{2}/ }).first();
    await dayChip.click();
    
    const timeChip = guestPage.getByRole("button", { name: /^\d{2}:\d{2}$/ }).first();
    await expect(timeChip).toBeVisible();
    await timeChip.click();
    await expect(guestPage.getByRole("dialog")).toBeVisible();
  });

  // ШАГ 8: Гость2 тоже открывает окно бронирования (ДО подтверждения первым) 
  await test.step("Гость2: регистрируется и тоже открывает окно бронирования на тот же слот", async () => {
    // Регистрация гостя2
    await guest2Page.goto("/pomidorqa/auth/register");
    await guest2L.nameInput.fill(guest2.name);
    await guest2L.emailInput.fill(guest2.email);
    await guest2L.passwordInput.fill(guest2.password);
    await guest2L.registerButton.click();
    await expect(guest2Page).toHaveURL(/\/pomidorqa\/?$/);

    // Поиск хоста
    await guest2L.skillInput.fill(skillTag);
    await guest2L.searchButton.click();
    const card2 = guest2L.hostNameText(host.name);
    await expect(card2).toBeVisible();
    await card2.click();

    // Выбор слота (тот же самый)
    await expect(async () => {
      const dayChip = guest2Page.getByRole("button", { name: /\d{2}\.\d{2}/ }).first();
      if (!(await dayChip.isVisible().catch(() => false))) {
        await guest2Page.reload();
      }
      await expect(dayChip).toBeVisible();
    }).toPass({ timeout: 10_000 });

    const dayChip = guest2Page.getByRole("button", { name: /\d{2}\.\d{2}/ }).first();
    await dayChip.click();
    
    const timeChip = guest2Page.getByRole("button", { name: /^\d{2}:\d{2}$/ }).first();
    await expect(timeChip).toBeVisible({ timeout: 10_000 });
    await timeChip.click();
    await expect(guest2Page.getByRole("dialog")).toBeVisible({ timeout: 10_000 });
  });

  //  ШАГ 9: Гость подтверждает бронирование (успех) 
  await test.step("Гость: подтверждает бронирование первым — успех", async () => {
    await guestPage.getByRole("button", { name: "Подтвердить" }).click();
    const success = guestPage.getByRole("alert", { name: "Бронирование успешно" });
    const error = guestPage.getByRole("alert", { name: "Ошибка бронирования" });
    await expect(success.or(error)).toBeVisible({ timeout: 15_000 });
    if (await error.isVisible().catch(() => false)) {
      throw new Error(`Бронирование не удалось: ${await error.textContent()}`);
    }
    await expect(success).toBeVisible();
  });

  // ШАГ 10: Гость2 пытается забронировать (ошибка) 
  await test.step("Гость2: пытается забронировать тот же слот вторым — видит ошибку", async () => {
    await guest2Page.getByRole("button", { name: "Подтвердить" }).click();
    
    const success2 = guest2Page.getByRole("alert", { name: "Бронирование успешно" });
    const error2 = guest2Page.getByRole("alert", { name: "Ошибка бронирования" });
    await expect(success2.or(error2)).toBeVisible({ timeout: 15_000 });

    // Ожидаем ошибку, а не успех
    if (await success2.isVisible().catch(() => false)) {
      throw new Error("Слот должен был быть занят, но бронирование прошло успешно");
    }
    await expect(error2).toBeVisible();
  });

  //  ШАГ 11: Гость видит бронирование в "Моих встречах" 
  await test.step("Гость: видит бронирование в разделе «Мои встречи»", async () => {
    await expect(async () => {
      await guestPage.goto("/pomidorqa/bookings");
      const l = locators(guestPage);
      const card = l.upcomingSection.getByTestId('PomidorqaBookings-card-name');
      await expect(card).toHaveText(host.name);
    }).toPass({ timeout: 10_000 });
  });

  //  ШАГ 12: Хост видит бронирование 
  await test.step("Хост: тоже видит это бронирование в своих «Мои встречи»", async () => {
    await expect(async () => {
      await hostPage.goto("/pomidorqa/bookings");
      const l = locators(hostPage);
      const card = l.upcomingSection.getByText(guest.name).first();
      await expect(card).toBeVisible();
    }).toPass({ timeout: 10_000 });
  });

  // ЗАКРЫТИЕ КОНТЕКСТОВ 
  await hostContext.close();
  await guestContext.close();
  await guest2Context.close();
});