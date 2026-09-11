import {
  test,
  expect,
  type APIRequestContext,
  type Page,
} from "@playwright/test";

const TEST_ACCOUNTS_ROUTE = "/api/pomidorqa/test/accounts";

export const ROUTES = {
  catalog: "/pomidorqa",
  register: "/pomidorqa/auth/register",
  profile: "/pomidorqa/profile",
  slots: "/pomidorqa/profile/slots",
  bookings: "/pomidorqa/bookings",
};

export type TestUser = {
  name: string;
  email: string;
  password: string;
};

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

export async function registerUserViaApi(
  request: APIRequestContext,
  user: TestUser,
): Promise<RegisteredParticipant> {
  const response = await request.post(TEST_ACCOUNTS_ROUTE, {
    data: user,
  });

  if (response.status() !== 201) {
    throw new Error(
      `Регистрация ${user.email} не удалась: ` +
        `${response.status()} ${await response.text()}`,
    );
  }

  return (await response.json()) as RegisteredParticipant;
}

export async function deleteUserViaApi(
  request: APIRequestContext,
): Promise<void> {
  const response = await request.delete(TEST_ACCOUNTS_ROUTE);

  if (response.status() !== 200) {
    throw new Error(
      `Удаление аккаунта не удалось: ` +
        `${response.status()} ${await response.text()}`,
    );
  }
}

export async function registerUser(
  page: Page,
  user: TestUser,
): Promise<void> {
  await test.step(`Хелпер: Регистрация пользователя ${user.name}`, async () => {
    let registrationPageResponse;

    try {
      registrationPageResponse = await page.goto(ROUTES.register);
    } catch (error) {
      const reason =
        error instanceof Error ? error.message : String(error);

      throw new Error(
        `Не удалось открыть страницу регистрации для ${user.email}. ` +
          `URL: ${page.url()}. Причина: ${reason}`,
      );
    }

    if (
      registrationPageResponse &&
      registrationPageResponse.status() >= 400
    ) {
      throw new Error(
        `Страница регистрации для ${user.email} вернула ` +
          `HTTP ${registrationPageResponse.status()} ` +
          `${registrationPageResponse.statusText()}`,
      );
    }

    await page.getByLabel("Имя").fill(user.name);
    await page.getByLabel("Email").fill(user.email);
    await page.getByLabel("Пароль").fill(user.password);

    await page
      .getByRole("button", { name: "Зарегистрироваться" })
      .click();

    await expect(
      page,
      `После регистрации ${user.email} ожидается переход на главную PomidorQA`,
    ).toHaveURL(/\/pomidorqa\/?$/, {
      timeout: 15_000,
    });
  });
}