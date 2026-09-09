import { test, expect } from "@playwright/test";

import { makeUser, registerUser } from "../helpers/user";

test.describe("Авторизация: выход и повторный вход", () => {
  test("пользователь может выйти из аккаунта и повторно авторизоваться", async ({
    page,
  }) => {
    const user = makeUser("hw13", Date.now());

    await test.step("Регистрируем нового пользователя", async () => {
      await registerUser(page, user);
    });

    await test.step("Проверяем, что пользователь вошёл в аккаунт", async () => {
      await expect(
        page.getByTestId("PomidorqaHeader-logout-button")
      ).toBeVisible();
    });

    await test.step("Выходим из аккаунта", async () => {
      await page.getByTestId("PomidorqaHeader-logout-button").click();
    });

    await test.step("Проверяем, что после выхода доступен вход", async () => {
      await expect(
        page.getByTestId("PomidorqaHeader-login-link")
      ).toBeVisible();
    });

    await test.step("Переходим на страницу входа", async () => {
      await page.getByTestId("PomidorqaHeader-login-link").click();
    });
    
    await test.step("Проверяем, что открылась страница входа", async () => {
      await expect(page).toHaveURL(/\/pomidorqa\/auth\/login/);
    });

    await test.step(
      "Вводим данные зарегистрированного пользователя",
      async () => {
        await page.getByLabel("Email").fill(user.email);
        await page.getByLabel("Пароль").fill(user.password);
      }
    );

    await test.step("Нажимаем «Войти»", async () => {
      await page.getByRole("button", { name: "Войти" }).click();
    });

    await test.step("Проверяем, что снова вошли в свой аккаунт", async () => {
      await expect(page).toHaveURL(/\/pomidorqa\/?$/);
      await expect(
        page.getByTestId("PomidorqaHeader-logout-button")
      ).toBeVisible();
    });
  });
});