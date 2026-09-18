import { expect, type APIRequestContext, type BrowserContext, type Page } from "@playwright/test";
import { RegisterPage } from "../pages/register-page";

// Регистрация и удаление через служебный тестовый API живого PomidorQA — без браузера
// и без UI-формы. Схема ручек (проверено вручную на aiqa.su):
//   POST   /api/pomidorqa/test/accounts   { name, email, password } → 201 { id, name, email }
//   DELETE /api/pomidorqa/test/accounts   (по сессионной cookie)    → 200 { success: true }
// Сервер принимает только тестовые email (см. isPomidorqaTestEmail на бэкенде) — makeUser
// ниже уже генерирует email на @example.com, этого достаточно.

export type TestUser = {
  name: string;
  email: string;
  password: string;
};

// Участник, которого вернул сервер после регистрации.
export type RegisteredParticipant = {
  id: string;
  name: string;
  email: string;
};

const TEST_ACCOUNTS_ENDPOINT = "/api/pomidorqa/test/accounts";

/**
 * Свой пользователь на каждый тест (кодекс, п.7): имя и email завязаны на runId
 * (обычно Date.now()), чтобы параллельные прогоны не конфликтовали друг с другом.
 * Пароль можно хардкодить — он не участвует в идентификации пользователя.
 */
export function makeUser(role: string, runId: number): TestUser {
  return {
    name: `${role} Автотест`,
    email: `${role}-${runId}@example.com`,
    password: "testpass123",
  };
}

/**
 * Регистрирует пользователя через UI-форму (в отличие от registerUserViaApi ниже):
 * нужна там, где сценарий сам проверяет форму регистрации (login-error.spec.ts)
 * или где важна обычная браузерная сессия без похода в служебный тестовый API
 * (profile-flow.spec.ts). Закрывает вход проверкой редиректа — это единственное
 * исключение, где helper для пользователя сам делает `expect`.
 */
export async function registerUser(page: Page, user: TestUser): Promise<void> {
  const registerPage = new RegisterPage(page);
  await registerPage.goto();
  await registerPage.fillForm(user);
  await registerPage.submit();
  await expect(page).toHaveURL(/\/pomidorqa\/?$/);
}

/**
 * Регистрирует тестового пользователя через служебный API PomidorQA.
 * После успешного ответа сервер кладёт в `request` сессионную cookie
 * (`pomidorqa_session`) — тот же APIRequestContext нужно передать в deleteUserViaApi,
 * чтобы удалить именно этого пользователя.
 */
export async function registerUserViaApi(
  request: APIRequestContext,
  user: TestUser
): Promise<RegisteredParticipant> {
  const response = await request.post(TEST_ACCOUNTS_ENDPOINT, { data: user });

  if (response.status() !== 201) {
    throw new Error(`Регистрация ${user.email} не удалась: ${response.status()} ${await response.text()}`);
  }

  return response.json();
}

/**
 * Удаляет пользователя, зарегистрированного этим же APIRequestContext — сервер
 * определяет аккаунт по сессионной cookie, id или email передавать не нужно.
 * Каскадно чистит навыки, слоты и бронирования аккаунта.
 */
export async function deleteUserViaApi(request: APIRequestContext): Promise<void> {
  const response = await request.delete(TEST_ACCOUNTS_ENDPOINT);

  if (response.status() !== 200) {
    throw new Error(`Удаление аккаунта не удалось: ${response.status()} ${await response.text()}`);
  }
}

/**
 * Уборка после сценария с несколькими браузерными контекстами (host/guest/guest2 и т.п.):
 * удаляет пользователя в каждом контексте и закрывает сам контекст. Рассчитан на afterEach —
 * ошибка удаления одного пользователя не должна мешать удалению и закрытию остальных,
 * поэтому такие ошибки не бросаются, а только предупреждением уходят в консоль.
 */
export async function cleanupUsersViaApi(contexts: BrowserContext[]): Promise<void> {
  const results = await Promise.allSettled(
    contexts.map((context) => deleteUserViaApi(context.request))
  );
  for (const result of results) {
    if (result.status === "rejected") {
      console.warn("Не удалось удалить тестового участника:", result.reason);
    }
  }

  await Promise.all(contexts.map((context) => context.close()));
}
