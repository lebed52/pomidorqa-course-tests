import { test, expect } from "@playwright/test";

// E2E-уровень пирамиды, негативный сценарий: сценарий 10 из списка ДЗ Урока 2.
// requirements.md, п.4: при неверном email ИЛИ пароле участник должен увидеть одну и ту же
// понятную ошибку, без уточнения, что именно неверно, — из соображений безопасности.

test("вход с неверными данными — одинаковая ошибка в обоих случаях, без уточнения причины", async ({
  page,
}) => {
  const runId = Date.now();
  const email = `login-check-${runId}@example.com`;
  const password = "correct-password-123";

  await test.step("Заводим реальный аккаунт для проверки", async () => {
    await page.goto("/pomidorqa/auth/register");
    await page.getByTestId("PomidorqaRegister-name-input").fill("Login Error Check");
    await page.getByTestId("PomidorqaRegister-email-input").fill(email);
    await page.getByTestId("PomidorqaRegister-password-input").fill(password);
    await page.getByTestId("PomidorqaRegister-submit").click();
    await expect(page).toHaveURL(/\/pomidorqa\/?$/);
  });

  let wrongPasswordError = "";
  await test.step("Пробуем войти с верным email, но неверным паролем", async () => {
    await page.goto("/pomidorqa/auth/login");
    await page.getByTestId("PomidorqaLogin-email-input").fill(email);
    await page.getByTestId("PomidorqaLogin-password-input").fill("wrong-password");
    await page.getByTestId("PomidorqaLogin-submit").click();
    const error = page.getByTestId("PomidorqaLogin-error");
    await expect(error).toBeVisible();
    wrongPasswordError = (await error.textContent())?.trim() ?? "";
  });

  let unknownEmailError = "";
  await test.step("Пробуем войти с несуществующим email", async () => {
    await page.goto("/pomidorqa/auth/login");
    await page.getByTestId("PomidorqaLogin-email-input").fill(`no-such-user-${runId}@example.com`);
    await page.getByTestId("PomidorqaLogin-password-input").fill("any-password-123");
    await page.getByTestId("PomidorqaLogin-submit").click();
    const error = page.getByTestId("PomidorqaLogin-error");
    await expect(error).toBeVisible();
    unknownEmailError = (await error.textContent())?.trim() ?? "";
  });

  await test.step("Проверяем: текст ошибки одинаковый в обоих случаях — не раскрывает, что именно неверно", async () => {
    expect(wrongPasswordError).toBe(unknownEmailError);
    expect(wrongPasswordError).toContain("Неверный");
  });
});
