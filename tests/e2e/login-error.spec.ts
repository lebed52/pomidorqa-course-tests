import { test, expect, type Page } from "@playwright/test";

// E2E-уровень пирамиды, негативный сценарий: сценарий 10 из списка ДЗ Урока 2.
// requirements.md, п.4: при неверном email ИЛИ пароле участник должен увидеть одну и ту же
// понятную ошибку, без уточнения, что именно неверно, — из соображений безопасности.

const LOCATORS = {
  auth: {
    name: (page: Page) => page.getByLabel("Имя"),
    email: (page: Page) => page.getByLabel("Email"),
    password: (page: Page) => page.getByLabel("Пароль"),
    registerSubmit: (page: Page) =>
      page.getByRole("button", { name: "Зарегистрироваться" }),
    loginSubmit: (page: Page) => page.getByRole("button", { name: "Войти" }),
    loginError: (page: Page) => page.getByText("Неверный email или пароль"),
  },
} as const;

test("вход с неверными данными — одинаковая ошибка в обоих случаях, без уточнения причины", async ({
  page,
}) => {
  const runId = Date.now();
  const email = `login-check-${runId}@example.com`;
  const password = "correct-password-123";

  await test.step("Заводим реальный аккаунт для проверки", async () => {
    await page.goto("/pomidorqa/auth/register");
    await LOCATORS.auth.name(page).fill("Login Error Check");
    await LOCATORS.auth.email(page).fill(email);
    await LOCATORS.auth.password(page).fill(password);
    await LOCATORS.auth.registerSubmit(page).click();
    await expect(page).toHaveURL(/\/pomidorqa\/?$/);
  });

  let wrongPasswordError = "";
  await test.step("Пробуем войти с верным email, но неверным паролем", async () => {
    await page.goto("/pomidorqa/auth/login");
    await LOCATORS.auth.email(page).fill(email);
    await LOCATORS.auth.password(page).fill("wrong-password");
    await LOCATORS.auth.loginSubmit(page).click();
    const error = LOCATORS.auth.loginError(page);
    await expect(error).toBeVisible();
    wrongPasswordError = (await error.textContent())?.trim() ?? "";
  });

  let unknownEmailError = "";
  await test.step("Пробуем войти с несуществующим email", async () => {
    await page.goto("/pomidorqa/auth/login");
    await LOCATORS.auth.email(page).fill(`no-such-user-${runId}@example.com`);
    await LOCATORS.auth.password(page).fill("any-password-123");
    await LOCATORS.auth.loginSubmit(page).click();
    const error = LOCATORS.auth.loginError(page);
    await expect(error).toBeVisible();
    unknownEmailError = (await error.textContent())?.trim() ?? "";
  });

  await test.step("Проверяем: текст ошибки одинаковый в обоих случаях — не раскрывает, что именно неверно", async () => {
    expect(wrongPasswordError).toBe(unknownEmailError);
    expect(wrongPasswordError).toContain("Неверный");
  });
});
