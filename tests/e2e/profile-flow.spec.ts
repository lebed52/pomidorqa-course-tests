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
    timezoneOption: page.locator('[name="timezone"]'),
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
            name: `Updated ${user.name}`,
            telegram: `@${user.name}`,
            timezone: 'Europe/Moscow',
            aboutYourself: 'I am super QA'
        }

        await profile.nameInput.fill(newData.name);
        await profile.telegramInput.fill(newData.telegram);
        await profile.timezoneOption.selectOption(newData.timezone);
        await profile.aboutYourselfInput.fill(newData.aboutYourself)
        await profile.saveButton.click();

        const actualValues = {
            name: await profile.nameInput.inputValue(),
            telegram: await profile.telegramInput.inputValue(),
            timezone: await profile.timezoneOption.inputValue(),
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
        //await page.waitForTimeout(200);

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
