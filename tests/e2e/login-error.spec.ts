import { test, expect } from "@playwright/test";
import { registerUser } from "../helpers/user";
import { LoginPage } from "../pages/login-page";

// E2E-уровень пирамиды, негативный сценарий: сценарий 10 из списка ДЗ Урока 2.
// requirements.md, п.4: при неверном email ИЛИ пароле участник должен увидеть одну и ту же
// понятную ошибку, без уточнения, что именно неверно, — из соображений безопасности.

test("вход с неверными данными — одинаковая ошибка в обоих случаях, без уточнения причины", async ({
  page,
}) => {
  const runId = Date.now();
  const email = `login-check-${runId}@example.com`;
  const password = "correct-password-123";
  const loginPage = new LoginPage(page);

  await test.step("Заводим реальный аккаунт для проверки", async () => {
    await registerUser(page, { name: "Login Error Check", email, password });
  });

  let wrongPasswordError = "";
  await test.step("Пробуем войти с верным email, но неверным паролем", async () => {
    await loginPage.goto();
    await loginPage.login(email, "wrong-password");
    await expect(loginPage.errorMessage).toBeVisible();
    wrongPasswordError = (await loginPage.errorMessage.textContent())?.trim() ?? "";
  });

  let unknownEmailError = "";
  await test.step("Пробуем войти с несуществующим email", async () => {
    await loginPage.goto();
    await loginPage.login(`no-such-user-${runId}@example.com`, "any-password-123");
    await expect(loginPage.errorMessage).toBeVisible();
    unknownEmailError = (await loginPage.errorMessage.textContent())?.trim() ?? "";
  });

  await test.step("Проверяем: текст ошибки одинаковый в обоих случаях — не раскрывает, что именно неверно", async () => {
    expect(wrongPasswordError).toBe(unknownEmailError);
    expect(wrongPasswordError).toContain("Неверный");
  });
});
