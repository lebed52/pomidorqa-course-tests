import { test, expect, request as playwrightRequest, type APIRequestContext } from "@playwright/test";
import { makeUser, registerUserViaApi, deleteUserViaApi } from "../helpers/user";

// API-уровень, но не локальный мок (в отличие от booking-api.spec.ts): бьём напрямую
// в служебный тестовый API живого PomidorQA — POST/DELETE /api/pomidorqa/test/accounts.
// Как и e2e, эти тесты можно направить на другой стенд через POMIDORQA_BASE_URL.

test.describe("API: регистрация участника PomidorQA (реальный сервер)", () => {
  let api: APIRequestContext;

  test.beforeAll(async () => {
    api = await playwrightRequest.newContext({
      baseURL: process.env.POMIDORQA_BASE_URL ?? "https://aiqa.su",
    });
  });

  test.afterAll(async () => {
    await api.dispose();
  });

  test("регистрация нового участника — 201, аккаунт создан с переданными данными", async () => {
    const user = makeUser("api-reg", Date.now());

    const participant = await test.step("Регистрируем участника через API", async () => {
      return registerUserViaApi(api, user);
    });

    await test.step("В ответе — переданные имя, email и непустой id", async () => {
      expect(participant.name).toBe(user.name);
      expect(participant.email).toBe(user.email);
      expect(participant.id).toBeTruthy();
    });

    await test.step("Удаляем аккаунт, чтобы не копить тестовые данные на проде", async () => {
      await deleteUserViaApi(api);
    });
  });

  // Требования п.4: email — идентификатор участника, второй аккаунт на тот же email
  // создаться не должен.
  test("повторная регистрация того же email — 409 email_taken", async () => {
    const user = makeUser("api-duplicate", Date.now());

    try {
      await test.step("Регистрируем участника первый раз", async () => {
        await registerUserViaApi(api, user);
      });

      const response = await test.step("Отправляем ту же регистрацию второй раз", async () => {
        return api.post("/api/pomidorqa/test/accounts", { data: user });
      });

      await test.step("Сервер отвечает 409 и объясняет причину", async () => {
        expect(response.status()).toBe(409);
        expect(await response.json()).toMatchObject({ error: "email_taken" });
      });
    } finally {
      await deleteUserViaApi(api);
    }
  });

  test("регистрация с коротким паролем — 400, аккаунт не создаётся", async () => {
    const user = { ...makeUser("api-short-pass", Date.now()), password: "short" };

    const response = await test.step("Отправляем пароль короче восьми символов", async () => {
      return api.post("/api/pomidorqa/test/accounts", { data: user });
    });

    await test.step("Сервер отклоняет регистрацию", async () => {
      expect(response.status()).toBe(400);
    });
  });
});
