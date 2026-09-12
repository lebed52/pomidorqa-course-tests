import { test, expect } from "@playwright/test";
import { deleteUserViaApi, makeLoginErrorData, registerUserViaApi } from "../helpers/user";
import { LoginPage } from "../pages/login-page";
import { expectSameLoginError } from "../helpers/login";

test.afterEach(async ({ page }) => {
  await deleteUserViaApi(page.context().request);
});

test("Вход с неверными данными — одинаковая ошибка в обоих случаях, без уточнения причины", async ({ page }) => {
  const { user, wrongPassword, unknownEmail, unknownPassword } = makeLoginErrorData();
  const loginPage = new LoginPage(page);

  let wrongPasswordError = "";
  let unknownEmailError = "";

  await registerUserViaApi(page.context().request, user);

  await test.step("Выполняем вход с неверным паролем", async () => {
    await page.goto("/pomidorqa/auth/login");
    await loginPage.login(user.email, wrongPassword);
  });

  await test.step("Проверяем ошибку при неверном пароле", async () => {
    await expect(loginPage.errorMessage()).toBeVisible();
    wrongPasswordError = await loginPage.getErrorText();
  });

  await test.step("Выполняем вход с несуществующим email", async () => {
    await page.goto("/pomidorqa/auth/login");
    await loginPage.login(unknownEmail, unknownPassword);
  });

  await test.step("Проверяем ошибку при несуществующем email", async () => {
    await expect(loginPage.errorMessage()).toBeVisible();
    unknownEmailError = await loginPage.getErrorText();
  });

  await test.step("Проверяем, что система показывает одинаковую ошибку", async () => {
    expectSameLoginError(wrongPasswordError, unknownEmailError);
  });
});