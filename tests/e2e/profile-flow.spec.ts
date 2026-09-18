import { test, expect, type Page } from "@playwright/test";

const ROUTES = {
    register: "/pomidorqa/auth/register",
    profile: "/pomidorqa/profile",
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
];

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

const registerNameInput = (page: Page) => page.getByLabel("Имя");
const registerEmailInput = (page: Page) => page.getByLabel("Email");
const registerPasswordInput = (page: Page) => page.getByLabel("Пароль");
const registerSubmitButton = (page: Page) => page.getByRole("button", { name: "Зарегистрироваться" });

const userNameInput = (page: Page) => page.getByLabel("Имя");
const userSocialTelegramInput = (page: Page) => page.getByLabel("Telegram");
const userTimezoneInput = (page: Page) => page.getByRole("combobox", { name: "Часовой пояс" });
const userDescriptionInput = (page: Page) => page.getByLabel("О себе");
const profileSubmitButton = (page: Page) => page.getByRole("button", { name: "Сохранить" });

const userSkillInput = (page: Page) => page.getByLabel("Навык");
const typeSelector = (page: Page) => page.getByLabel("Тип");
const skillSubmitButton = (page: Page) => page.getByRole("button", { name: "Добавить" });
const skillCanHelpTag = (page: Page) => page.getByTestId("can-help-skills");
const skillWantToLearnTag = (page: Page) => page.locator('[data-skills="want_to_learn"]');
const skillChip = (page: Page, tag: string) => page.locator(`[data-skill-tag="${tag}"]`);
const removeSkillButton = (page: Page, tag: string) =>
    page.getByRole("button", { name: `Убрать ${tag}` });

async function registerUser(page: Page, user: TestUser) {
    await page.goto(ROUTES.register);
    await registerNameInput(page).fill(user.name);
    await registerEmailInput(page).fill(user.email);
    await registerPasswordInput(page).fill(user.password);
    await registerSubmitButton(page).click();
    await expect(page).toHaveURL(/\/pomidorqa\/?$/, { timeout: 15_000 });
}

function changeUserName(oldName: string) {
    return {
        newName: `${oldName}-${Date.now()}`,
    };
}

function createUserNickname(nickname: string) {
    return {
        newNickname: `@${nickname}-${Date.now()}`,
    };
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

async function saveProfileAndWait(page: Page) {
    const saved = page.waitForResponse(
        (r) => r.url().endsWith(ROUTES.profile) && r.request().method() === "POST"
    );
    await profileSubmitButton(page).click();
    await saved;
}

async function addSkillAndWait(page: Page) {
    const added = page.waitForResponse(
        (r) => r.url().includes(ROUTES.profile) && r.request().method() === "POST"
    );
    await skillSubmitButton(page).click();
    await added;
}

test.describe("Тесты профиля", () => {
    let user: TestUser;

    test.beforeEach(async ({ page }) => {
        user = makeUser();
        await registerUser(page, user);
        await page.goto(ROUTES.profile);
    });

    test("Изменение имени профиля", async ({ page }) => {
        const changedName = changeUserName(user.name);

        await test.step("Заполняем имя и сохраняем", async () => {
            await userNameInput(page).fill(changedName.newName);
            await saveProfileAndWait(page);
        });

        await test.step("Проверяем новое имя в поле", async () => {
            await expect(userNameInput(page)).toHaveValue(changedName.newName);
        });
    });

    test("Заполнение Telegram", async ({ page }) => {
        const tgNickname = createUserNickname(user.name);

        await test.step("Заполняем Telegram и сохраняем", async () => {
            await userSocialTelegramInput(page).fill(tgNickname.newNickname);
            await saveProfileAndWait(page);
        });

        await test.step("Проверяем Telegram в поле", async () => {
            await expect(userSocialTelegramInput(page)).toHaveValue(tgNickname.newNickname);
        });
    });

    test("Заполнение часового пояса", async ({ page }) => {
        const timezone = pickRandomTimezone();

        await test.step("Выбираем часовой пояс и сохраняем", async () => {
            await userTimezoneInput(page).selectOption(timezone.timezone);
            await saveProfileAndWait(page);
        });

        await test.step("Проверяем выбранный часовой пояс", async () => {
            await expect(userTimezoneInput(page)).toHaveValue(timezone.timezone);
        });
    });

    test("Заполнение описания", async ({ page }) => {
        const description = `description-${Date.now()}`;

        await test.step("Заполняем описание и сохраняем", async () => {
            await userDescriptionInput(page).fill(description);
            await saveProfileAndWait(page);
        });

        await test.step("Проверяем текст описания", async () => {
            await expect(userDescriptionInput(page)).toHaveValue(description);
        });
    });

    test("Заполнение навыка", async ({ page }) => {
        const type = pickRandomSkillType();
        const skill = `skill-${Date.now()}`;
        const skillsList =
            type.skillType === "can_help"
                ? skillCanHelpTag(page)
                : skillWantToLearnTag(page);

        await test.step("Заполняем навык и добавляем", async () => {
            await userSkillInput(page).fill(skill);
            await typeSelector(page).selectOption(type.skillType);
            await addSkillAndWait(page);
        });

        await test.step("Проверяем навык в списке", async () => {
            await expect(skillsList).toContainText(skill);
        });
    });

    test("Пустое имя не сохраняется", async ({ page }) => {
        const oldName = user.name;

        await test.step("Проверяем имя в поле", async () => {
            await expect(userNameInput(page)).toHaveValue(oldName);
        });

        await test.step("Вводим пустое имя", async () => {
            await userNameInput(page).fill("");
        });

        await test.step("Сохраняем форму", async () => {
            await profileSubmitButton(page).click();
        });

        await test.step("Проверяем имя после рефреша страницы", async () => {
            await page.reload();
            await expect(userNameInput(page)).toHaveValue(oldName);
        });
    });

    test("Удаляем навык", async ({ page }) => {
        const skill = `skill-${Date.now()}`;

        await test.step("Добавляем навык 'Могу помочь'", async () => {
            await userSkillInput(page).fill(skill);
            await typeSelector(page).selectOption(SKILLS[0]);
            await addSkillAndWait(page);
        });

        await test.step("Проверяем добавленный навык", async () => {
            await page.reload();
            await expect(skillCanHelpTag(page)).toContainText(skill);
        });

        await test.step("Удаляем навык", async () => {
            await removeSkillButton(page, skill).click();
            await expect(skillChip(page, skill)).not.toBeVisible();
        });

        await test.step("Проверяем, что навыка больше нет", async () => {
            await page.reload();
            await expect(skillChip(page, skill)).not.toBeVisible();
        });
    });

    test("Смена Telegram", async ({ page }) => {
        const oldTelegram = createUserNickname(user.name);
        const newTelegram = `${oldTelegram.newNickname}-new`;

        await test.step("Заполняем Telegram", async () => {
            await userSocialTelegramInput(page).fill(oldTelegram.newNickname);
            await saveProfileAndWait(page);
        });

        await test.step("Проверяем отображение первого Telegram", async () => {
            await page.reload();
            await expect(userSocialTelegramInput(page)).toHaveValue(oldTelegram.newNickname);
        });

        await test.step("Изменяем Telegram", async () => {
            await userSocialTelegramInput(page).fill(newTelegram);
            await saveProfileAndWait(page);
        });

        await test.step("Проверяем отображение нового Telegram", async () => {
            await page.reload();
            await expect(userSocialTelegramInput(page)).toHaveValue(newTelegram);
        });
    });
});
