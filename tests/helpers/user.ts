import { test, expect, type APIRequestContext, type Page } from "@playwright/test";

export const ROUTES = {
  catalog: "/pomidorqa",
  register: "/pomidorqa/auth/register",
  profile: "/pomidorqa/profile",
  slots: "/pomidorqa/profile/slots",
};

const TEST_ACCOUNTS_ENDPOINT = "/api/pomidorqa/test/accounts";

export type TestUser = {
  name: string;
  email: string;
  password: string;
};

// Участник, которого вернул сервер после регистрации через API.
export type RegisteredParticipant = {
  id: string;
  name: string;
  email: string;
};

export function makeUser(role: string): TestUser {
  const unique = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

  return {
    name: `${role} Автотест ${unique}`,
    email: `${role}-${unique}@example.com`,
    password: "testpass123",
  };
}

export async function registerUser(
  page: Page,
  user: TestUser,
): Promise<void> {
  await test.step(`Хелпер: регистрация пользователя ${user.name}`, async () => {
    const response = await page.goto(ROUTES.register);

    if (response && response.status() >= 400) {
      throw new Error(
        `Страница регистрации вернула HTTP ${response.status()} ${response.statusText()}`,
      );
    }

    await page.getByLabel("Имя").fill(user.name);
    await page.getByLabel("Email").fill(user.email);
    await page.getByLabel("Пароль").fill(user.password);
    await page
      .getByRole("button", { name: "Зарегистрироваться" })
      .click();

    await expect(page).toHaveURL(/\/pomidorqa\/?$/, { timeout: 15_000 });
  });
}

/**
 * Регистрирует тестового пользователя через служебный API PomidorQA (Arrange для
 * сценариев, которые не проверяют саму форму регистрации — Урок 14).
 * После успешного ответа сервер кладёт в `request` сессионную cookie — тем же
 * APIRequestContext нужно потом вызывать deleteUserViaApi.
 */
export async function registerUserViaApi(
  request: APIRequestContext,
  user: TestUser,
): Promise<RegisteredParticipant> {
  return test.step(`Хелпер: регистрация участника ${user.name} через API`, async () => {
    const response = await request.post(TEST_ACCOUNTS_ENDPOINT, { data: user });

    if (response.status() !== 201) {
      throw new Error(
        `Регистрация ${user.email} не удалась: ${response.status()} ${await response.text()}`,
      );
    }

    return response.json();
  });
}

/**
 * Удаляет пользователя, зарегистрированного этим же APIRequestContext — сервер
 * определяет аккаунт по сессионной cookie, id или email передавать не нужно.
 */
export async function deleteUserViaApi(request: APIRequestContext): Promise<void> {
  await test.step("Хелпер: удаление тестового участника через API", async () => {
    const response = await request.delete(TEST_ACCOUNTS_ENDPOINT);

    if (response.status() !== 200) {
      throw new Error(
        `Удаление аккаунта не удалось: ${response.status()} ${await response.text()}`,
      );
    }
  });
}
