import { test, expect, type Page } from "@playwright/test";

const ROUTES = {
    register: "/pomidorqa/auth/register",
    profile: "/pomidorqa/profile"
};

const TIME_ZONES = [
    "Europe/Kaliningrad",   // UTC+2
    "Europe/Samara",        // UTC+4
    "Asia/Yekaterinburg",   // UTC+5
    "Asia/Omsk",            // UTC+6
    "Asia/Novosibirsk",     // UTC+7
    "Asia/Krasnoyarsk",     // UTC+7
    "Asia/Irkutsk",         // UTC+8
    "Asia/Yakutsk",         // UTC+9
    "Asia/Vladivostok",     // UTC+10
];

const SKILLS = [
    "can_help",
    "want_to_learn",
]

type TestUser = {
    name: string;
    email: string;
    password: string;
};

function makeUser(): TestUser {
    const runId = Date.now();

    return {
        name: `Автотест-${runId}`,
        email: `${runId}@example.com`,
        password: "testpass123",
    };
}
//Локаторы
const locators = (page: Page) => ({
    registerNameInput: page.getByLabel("Имя"),
    registerEmailInput: page.getByLabel("Email"),
    registerPasswordInput: page.getByLabel("Пароль"),
    registerSubmitButton: page.getByRole("button", { name: "Зарегистрироваться" }),

    userNameInput: page.getByLabel("Имя"),
    userSocialTelegramInput: page.getByLabel("Telegram"),
    userTimezoneInput: page.getByRole("combobox", {name: "Часовой пояс"}),
    userDescriptionInput: page.getByLabel("О себе"),
    profileSubmitButton: page.getByRole("button", { name: "Сохранить" }),
    userSkillInput: page.getByLabel("Навык"),
    typeSelector: page.getByLabel("Тип"),
    skillSubmitButton: page.getByRole("button", { name: "Добавить" }),
    skillCanHelpTag: page.getByTestId("can-help-skills"),
    skillWantToLearnTag: page.locator('[data-skills="want_to_learn"]')
});

async function registerUser(page: Page, user: TestUser) {
    const elements = locators(page);

    await page.goto(ROUTES.register);
    await elements.registerNameInput.fill(user.name);
    await elements.registerEmailInput.fill(user.email);
    await elements.registerPasswordInput.fill(user.password);
    await elements.registerSubmitButton.click();
    await expect(page).toHaveURL(/\/pomidorqa\/?$/, { timeout: 15_000 });
}
function changeUserName(oldName: string) {

    return {
        newName: `${oldName}-${Date.now()}`,
    }
}

function createUserNickname(nickname: string) {
    return {
        newNickname: `@${nickname}-${Date.now()}`,
    }
}

function pickRandomTimezone() {
    const index = Math.floor(Math.random() * TIME_ZONES.length);
    return {
        timezone: TIME_ZONES[index],
    };
}

function pickRandomSkillType() {
    const index = Math.floor(Math.random() * SKILLS.length);
    return {
        skillType: SKILLS[index],
    };
}

test.describe("Заполнение профиля", ()  => {
    let user: TestUser;

    test.beforeEach(async ({ page }) => {
        user = makeUser();
        await registerUser(page, user);
        await page.goto(ROUTES.profile);
    });

    test("Изменение имени профиля", async ({page}) => {
        const elements = locators(page);
        const changedName = changeUserName(user.name);

        await elements.userNameInput.fill(changedName.newName);
        await elements.profileSubmitButton.click();

        await expect(elements.userNameInput).toHaveValue(changedName.newName)

    });

    test("Заполнение Telegram",async ({page}) => {
        const elements = locators(page);
        const tgNickname = createUserNickname(user.name);

        await elements.userSocialTelegramInput.fill(tgNickname.newNickname)
        await elements.profileSubmitButton.click();

        await expect(elements.userSocialTelegramInput).toHaveValue(tgNickname.newNickname);
    })

    test("Заполнение часового пояса", async({page}) => {
        const elements = locators(page);
        const timezone = pickRandomTimezone()

        await elements.userTimezoneInput.selectOption(timezone.timezone)
        await elements.profileSubmitButton.click();

        await expect(elements.userTimezoneInput).toHaveValue(timezone.timezone)
    })

    test("Заполнение описания", async ({page}) => {
        const elements = locators(page);
        const description = `description-${Date.now()}`;

        await elements.userDescriptionInput.fill(description);
        await elements.profileSubmitButton.click();

        await expect(elements.userDescriptionInput).toHaveValue(description);
    })

    test("Заполнение навыка", async ({page}) => {
        const elements = locators(page);
        const type = pickRandomSkillType()
        const skill = `skill-${Date.now()}`;

        await elements.userSkillInput.fill(skill);
        await elements.typeSelector.selectOption(type.skillType)
        await elements.skillSubmitButton.click();

        const skillsList =
            type.skillType === "can_help"
                ? elements.skillCanHelpTag
                : elements.skillWantToLearnTag;

        await expect(skillsList).toContainText(skill);
    })
});
