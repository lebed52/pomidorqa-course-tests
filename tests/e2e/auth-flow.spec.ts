import { expect, test, type BrowserContext } from "@playwright/test";
import {
  cleanupUsersViaApi,
  makeUser,
  registerUser,
  registerUserViaApi,
} from "../helpers/user";
import { AppHeader } from "../pages/app-header";
import { LoginPage } from "../pages/login-page";
import { ProfilePage } from "../pages/profile-page";
import { RegisterPage } from "../pages/register-page";

let accountContexts: BrowserContext[] = [];

test.describe("Авторизация и регистрация", () => {
  test.afterEach(async () => {
    await cleanupUsersViaApi(accountContexts);
    accountContexts = [];
  });

  test("успешный вход сохраняет сессию, а выход закрывает приватные страницы", async ({
    browser,
    page,
  }, testInfo) => {
    const user = makeUser("auth-flow", Date.now());
    const accountContext = await browser.newContext({ baseURL: testInfo.project.use.baseURL });
    accountContexts = [accountContext];
    const loginPage = new LoginPage(page);
    const header = new AppHeader(page);

    await test.step("Создаём аккаунт через служебный API", async () => {
      await registerUserViaApi(accountContext.request, user);
    });

    await test.step("Пользователь входит с правильными данными", async () => {
      await loginPage.goto();
      await loginPage.login(user.email, user.password);
    });

    await test.step("Открывается каталог и сессия сохраняется после перезагрузки", async () => {
      await expect(page).toHaveURL(/\/pomidorqa\/?$/);
      await expect(header.logoutButton).toBeVisible();
      await page.reload();
      await expect(header.logoutButton).toBeVisible();
    });

    await test.step("Пользователь выходит", async () => {
      await header.logout();
    });

    await test.step("После выхода приватная страница перенаправляет на вход", async () => {
      await page.goto("/pomidorqa/profile");
      await expect(page).toHaveURL(/\/pomidorqa\/auth\/login$/);
      await expect(loginPage.submitButton).toBeVisible();
    });
  });

  // Требования п.4: после регистрации профиль создаётся автоматически — имя берётся
  // из формы регистрации, часовой пояс по умолчанию Europe/Moscow.
  test("после регистрации профиль заполнен именем и московским часовым поясом", async ({
    browser,
  }, testInfo) => {
    const user = makeUser("default-profile", Date.now());
    const accountContext = await browser.newContext({ baseURL: testInfo.project.use.baseURL });
    accountContexts = [accountContext];
    const profile = new ProfilePage(await accountContext.newPage());

    await test.step("Участник регистрируется через форму", async () => {
      await registerUser(profile.page, user);
    });

    await test.step("Профиль открывается с именем из регистрации и поясом Europe/Moscow", async () => {
      await profile.goto();
      await expect(profile.nameInput).toHaveValue(user.name);
      await expect(profile.timezoneSelect).toHaveValue("Europe/Moscow");
    });
  });

  test("форма регистрации блокирует пустые поля, неверный email и короткий пароль", async ({
    page,
  }) => {
    const registerPage = new RegisterPage(page);

    await test.step("Отправляем полностью пустую форму", async () => {
      await registerPage.goto();
      await registerPage.submit();
    });

    await test.step("Обязательные поля не проходят браузерную валидацию", async () => {
      expect(await registerPage.nameInput.evaluate((input) => input.validity.valid)).toBe(false);
      expect(await registerPage.emailInput.evaluate((input) => input.validity.valid)).toBe(false);
      expect(await registerPage.passwordInput.evaluate((input) => input.validity.valid)).toBe(false);
      await expect(page).toHaveURL(/\/pomidorqa\/auth\/register$/);
    });

    await test.step("Вводим неверный email", async () => {
      await registerPage.nameInput.fill("Validation User");
      await registerPage.emailInput.fill("not-an-email");
      await registerPage.passwordInput.fill("validpass123");
      await registerPage.submit();
    });

    await test.step("Email не проходит валидацию, форма не отправляется", async () => {
      expect(await registerPage.emailInput.evaluate((input) => input.validity.valid)).toBe(false);
      await expect(page).toHaveURL(/\/pomidorqa\/auth\/register$/);
    });

    await test.step("Вводим пароль короче восьми символов", async () => {
      await registerPage.emailInput.fill(`validation-${Date.now()}@example.com`);
      await registerPage.passwordInput.fill("short");
      await registerPage.submit();
    });

    await test.step("Короткий пароль не проходит валидацию, форма не отправляется", async () => {
      expect(await registerPage.passwordInput.evaluate((input) => input.validity.valid)).toBe(false);
      await expect(page).toHaveURL(/\/pomidorqa\/auth\/register$/);
    });
  });
});
