import { test, expect } from "@playwright/test";
import { makeUser, registerUser } from "../helpers/user";

// E2E-уровень пирамиды, негативный сценарий: сценарий 10 из списка ДЗ Урока 2.
// requirements.md, п.4: при неверном email ИЛИ пароле участник должен увидеть одну и ту же
// понятную ошибку, без уточнения, что именно неверно, — из соображений безопасности.

test("вход с неверными данными — одинаковая ошибка в обоих случаях, без уточнения причины", async ({
  page,
}) => {
  const user = makeUser("logincheck", Date.now());
  let wrongPasswordError = "";
  let unknownEmailError = "";

  await test.step("Заводим реальный аккаунт для проверки", async () => {
    await registerUser(page, user);
  });

  await test.step("Входим с верным email, но неверным паролем", async () => {
    await page.goto("/pomidorqa/auth/login");
    await page.getByLabel("Email").fill(user.email);
    await page.getByLabel("Пароль").fill("wrong-password");
    await page.getByRole("button", { name: "Войти" }).click();
  });

  await test.step("Показалась ошибка входа", async () => {
    await expect(page.getByText(/Неверный/)).toBeVisible();
  });

  await test.step("Запоминаем текст этой ошибки", async () => {
    wrongPasswordError = (await page.getByText(/Неверный/).textContent())?.trim() ?? "";
  });

  await test.step("Входим с несуществующим email", async () => {
    await page.goto("/pomidorqa/auth/login");
    await page.getByLabel("Email").fill(`no-such-user-${Date.now()}@example.com`);
    await page.getByLabel("Пароль").fill("any-password-123");
    await page.getByRole("button", { name: "Войти" }).click();
  });

  await test.step("Снова показалась ошибка входа", async () => {
    await expect(page.getByText(/Неверный/)).toBeVisible();
  });

  await test.step("Запоминаем текст второй ошибки", async () => {
    unknownEmailError = (await page.getByText(/Неверный/).textContent())?.trim() ?? "";
  });

  await test.step("Текст ошибки одинаковый и не раскрывает, что именно неверно", async () => {
    expect(wrongPasswordError).toBe(unknownEmailError);
    expect(wrongPasswordError).toContain("Неверный");
  });
});
