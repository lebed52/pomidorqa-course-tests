import {test, expect, type Page, Locator} from "@playwright/test";

const registerLocators = (page: Page) => ({
    nameInput: page.getByLabel("Имя"),
    emailInput: page.getByLabel("Email"),
    passwordInput: page.getByLabel("Пароль"),
    registerButton: page.getByRole('button', {name: "Зарегистрироваться"}),
});

const profileLocators = (page: Page) => ({
    mainHeadings: page.getByRole('heading'),
    paragraphs: page.getByRole('paragraph'),
    nameInput: page.getByLabel('Имя'),
    telegramInput: page.getByLabel('Telegram'),
    timezoneInput: page.getByLabel('Часовой пояс'),
    aboutYourselfInput: page.getByLabel('О себе'),
    saveButton: page.getByRole('button', {name: "Сохранить"}),
    skillInput: page.getByLabel('Навык'),
    skillType: page.locator("#pomidorqa-profile-skill-type"),
    addButton: page.getByRole('button', {name: 'Добавить'}),
    canHelpSkillsSection: page.getByTestId("can-help-skills"),
    wantToLearnSkillsSection: page.locator('[data-skills="want_to_learn"]'),
    allSkills: page.locator('[data-skill-tag]'),
    getSkillsInSection: (section: Locator) =>
        section.locator('[data-skill-tag]')
})

type TestUser = {
    name: string;
    email: string;
    password: string;
};

function makeUser(role: string, runId: number): TestUser {
    return {
        name: `${role}_autotest`,
        email: `${role}-${runId}@example.com`,
        password: "testpass123",
    };
}

async function registerUser(page: Page, user: TestUser) {
    const register = registerLocators(page);

    await page.goto("/pomidorqa/auth/register");
    await register.nameInput.fill(user.name);
    await register.emailInput.fill(user.email);
    await register.passwordInput.fill(user.password);
    await register.registerButton.click();
    await expect(page).toHaveURL(/\/pomidorqa\/?$/);
}

test.describe("Набор тестов для страницы профиля", () => {
    let user: TestUser;
    let runId: number;

    test.beforeEach(async ({page}) => {
        runId = Date.now();
        user = makeUser("user", runId);
        await registerUser(page, user);
        await page.goto("/pomidorqa/profile");
    });

    test("Изменение имени в профиле", async ({page}) => {
        const profile = profileLocators(page);
        const newName = `Updated ${runId}`;

        await profile.nameInput.fill(newName);
        await profile.saveButton.click();

        await expect(profile.nameInput).toHaveValue(newName);
    });

    test("Изменение часового пояса", async ({ page }) => {
        const profile = profileLocators(page);
        const newTimeZone = 'Europe/Kaliningrad';

        await profile.timezoneInput.selectOption(newTimeZone);
        await profile.saveButton.click();

        await expect(profile.timezoneInput).toHaveValue(newTimeZone);
    });

    test("Изменение Telegram", async ({ page }) => {
        const profile = profileLocators(page);
        const newTelegram = `@updated_${runId}`;

        await profile.telegramInput.fill(newTelegram);
        await profile.saveButton.click();

        await expect(profile.telegramInput).toHaveValue(newTelegram);
    });

    test('Изменение поля "О себе"', async ({ page }) => {
        const profile = profileLocators(page);
        const newAboutYourself = `Updated ${runId}`;

        await profile.aboutYourselfInput.fill(newAboutYourself);
        await profile.saveButton.click();

        await expect(profile.aboutYourselfInput).toHaveValue(newAboutYourself);
    });

    test("добавление навыка в раздел 'Могу помочь'", async ({page}) => {
        const profile = profileLocators(page);
        const skillTag = `Skill-${runId}`;

        await profile.skillInput.fill(skillTag);
        await profile.skillType.selectOption("can_help");
        await profile.addButton.click();

        await expect(profile.canHelpSkillsSection).toContainText(skillTag);
    });

    test("Страница профиля отображает заголовки и описания разделов", async ({page}) => {
        const profile = profileLocators(page);
        const headings = ['Твой профиль', 'Навыки'];
        const paragraphs = [
            'Эти данные видны другим участникам в каталоге — заполни честно, это влияет на подбор.',
            'Добавь то, чем можешь помочь, и то, что хочешь разобрать — по этому тебя будут находить в каталоге.'
        ];

        await expect(profile.mainHeadings).toHaveText(headings);
        await expect(profile.paragraphs).toHaveText(paragraphs);
    });

    test("Успешное сохранение измененных анкетных данных профиля", async ({page}) => {
        const profile = profileLocators(page);
        const newData = {
            name: `Updated ${user.name}${runId}`,
            telegram: `@${user.name}${runId}`,
            timezone: 'Europe/Kaliningrad',
            aboutYourself: 'I am super QA'
        }

        await profile.nameInput.fill(newData.name);
        await profile.telegramInput.fill(newData.telegram);
        await profile.timezoneInput.selectOption(newData.timezone);
        await profile.aboutYourselfInput.fill(newData.aboutYourself)
        await profile.saveButton.click();

        const actualValues = {
            name: await profile.nameInput.inputValue(),
            telegram: await profile.telegramInput.inputValue(),
            timezone: await profile.timezoneInput.inputValue(),
            aboutYourself: await profile.aboutYourselfInput.inputValue(),
        };
        expect(actualValues).toEqual(newData);
    });

    test("Поле 'О себе' изменяет высоту при перетаскивании", async ({page}) => {
        const profile = profileLocators(page);

        // Получаем начальные размеры
        const initialBox = await profile.aboutYourselfInput.boundingBox();

        // Вычисляем точку захвата (правый нижний угол с отступом внутрь)
        const startX = initialBox!.x + initialBox!.width - 5;
        const startY = initialBox!.y + initialBox!.height - 5;

        // Эмулируем перетаскивание вниз
        await page.mouse.move(startX, startY);
        await page.mouse.down();

        //Тянем вниз на 100px. steps: 10 делает движение плавным, что важно для браузера
        await page.mouse.move(startX, startY + 100, {steps: 10});
        await page.mouse.up();

        // Проверяем новые размеры
        const newBox = await profile.aboutYourselfInput.boundingBox();
        expect(newBox!.height).toBeGreaterThan(initialBox!.height);
    });

    test("Система блокирует добавление одинакового навыка в одну категорию", async ({page}) => {
        const profile = profileLocators(page);
        const skillTag = `Skill-${runId}`;

        await profile.skillInput.fill(skillTag);
        await profile.skillType.selectOption("want_to_learn");
        await profile.addButton.click();

        await profile.skillInput.fill(skillTag);
        await profile.skillType.selectOption("want_to_learn");
        await profile.addButton.click();

        const addedSkills = profile.getSkillsInSection(profile.wantToLearnSkillsSection);
        await expect(addedSkills).toHaveCount(1);
        await expect(addedSkills).toHaveText(`${skillTag}×`);
    });

    test("Успешное удаление добавленного навыка", async ({page}) => {
        const profile = profileLocators(page);
        const skillTag = `Skill-To-Delete-${runId}`;

        await profile.skillInput.fill(skillTag);
        await profile.skillType.selectOption("can_help");
        await profile.addButton.click();

        const addedSkill = profile.allSkills.filter({hasText: `${skillTag}×`});
        await addedSkill.click();

        await expect(addedSkill).not.toBeVisible();
        await expect(profile.allSkills).toHaveCount(0);
    });
});
