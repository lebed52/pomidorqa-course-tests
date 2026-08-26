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

async function registerUser(page: Page, user: TestUser) {
    await page.goto("/pomidorqa/auth/register");
    await page.getByRole("textbox", { name: "Имя" }).fill(user.name);
    await page.getByRole("textbox", { name: "Email" }).fill(user.email);
    await page.getByRole("textbox", { name: "Пароль" }).fill(user.password);
    await page.getByRole("button", { name: "Зарегистрироваться" }).click();
    await expect(page).toHaveURL(/\/pomidorqa\/?$/);
}

let host: TestUser;

test.beforeEach(async ({ page }) => {
    host = makeUser("host", Date.now());

    await registerUser(page, host);
});

test("имя пользователя отображается в профиле", async ({ page }) => {
    await page.goto("/pomidorqa/profile");

    await expect(page.getByLabel("Имя")).toHaveValue(host.name);
});

test("часовой пояс пользователя отображается в профиле", async ({ page }) => {
    await page.goto("/pomidorqa/profile");

    await expect(page.getByLabel("Часовой пояс")).toHaveValue("Europe/Moscow");
});

test("Telegram пользователя отображается в профиле", async ({ page }) => {
    await page.goto("/pomidorqa/profile");

    const telegram = `@host_${Date.now()}`;

    await page.getByLabel("Telegram").fill(telegram);
    await page.getByRole("button", { name: "Сохранить" }).click();

    await expect(page.getByLabel("Telegram")).toHaveValue(telegram);
});

test("описание пользователя отображается в профиле", async ({ page }) => {
    await page.goto("/pomidorqa/profile");

    const about = "Изучаю Playwright и автоматизацию тестирования";

    await page.getByLabel("О себе").fill(about);
    await page.getByRole("button", { name: "Сохранить" }).click();

    await expect(page.getByLabel("О себе")).toHaveValue(about);
});

test("навык пользователя отображается в профиле", async ({ page }) => {
    await page.goto("/pomidorqa/profile");

    const skill = "Playwright";

    await page
        .getByPlaceholder("Например: Playwright, SQL, собеседования")
        .fill(skill);

    await page.getByRole("combobox", { name: "Тип" })
        .selectOption({ label: "Могу помочь" });

    await page.getByRole("button", { name: "Добавить" }).click();

    await expect(page.locator(`[data-skill-tag="${skill}"]`)).toBeVisible();
});