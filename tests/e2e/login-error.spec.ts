import { test, expect, type Page } from "@playwright/test";

// E2E-уровень пирамиды, негативный сценарий: сценарий 10 из списка ДЗ Урока 2.
// requirements.md, п.4: при неверном email ИЛИ пароле участник должен увидеть одну и ту же
// понятную ошибку, без уточнения, что именно неверно, — из соображений безопасности.

const locators = {
  nameInput: (page: Page) => page.getByLabel("Имя"),
  registerEmailInput: (page: Page) => page.getByLabel("Email"),
  registerPasswordInput: (page: Page) => page.getByLabel("Пароль"),
  registerButton: (page: Page) =>
    page.getByRole("button", { name: "Зарегистрироваться" }),
  loginEmailInput: (page: Page) => page.getByLabel("Email"),
  loginPasswordInput: (page: Page) => page.getByLabel("Пароль"),
  loginButton: (page: Page) => page.getByRole("button", { name: "Войти" }),
  loginError: (page: Page) => page.getByText(/Неверный/),
};

test("вход с неверными данными — одинаковая ошибка в обоих случаях, без уточнения причины", async ({
  page,
}) => {
  const runId = Date.now();
  const email = `login-check-${runId}@example.com`;
  const password = "correct-password-123";

  await test.step("Заводим реальный аккаунт для проверки", async () => {
    await page.goto("/pomidorqa/auth/register");
    await locators.nameInput(page).fill("Login Error Check");
    await locators.registerEmailInput(page).fill(email);
    await locators.registerPasswordInput(page).fill(password);
    await locators.registerButton(page).click();
    await expect(page).toHaveURL(/\/pomidorqa\/?$/);
  });

  let wrongPasswordError = "";
  await test.step("Пробуем войти с верным email, но неверным паролем", async () => {
    await page.goto("/pomidorqa/auth/login");
    await locators.loginEmailInput(page).fill(email);
    await locators.loginPasswordInput(page).fill("wrong-password");
    await locators.loginButton(page).click();
    const error = locators.loginError(page);
    await expect(error).toBeVisible();
    wrongPasswordError = (await error.textContent())?.trim() ?? "";
  });

  let unknownEmailError = "";
  await test.step("Пробуем войти с несуществующим email", async () => {
    await page.goto("/pomidorqa/auth/login");
    await locators.loginEmailInput(page).fill(`no-such-user-${runId}@example.com`);
    await locators.loginPasswordInput(page).fill("any-password-123");
    await locators.loginButton(page).click();
    const error = locators.loginError(page);
    await expect(error).toBeVisible();
    unknownEmailError = (await error.textContent())?.trim() ?? "";
  });

  await test.step("Проверяем: текст ошибки одинаковый в обоих случаях — не раскрывает, что именно неверно", async () => {
    expect(wrongPasswordError).toBe(unknownEmailError);
    expect(wrongPasswordError).toContain("Неверный");
  });
});
