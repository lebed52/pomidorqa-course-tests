import { APIRequestContext, Page, expect } from "@playwright/test";

export type TestUser = {
  name: string;
  email: string;
  password: string;
};

export function makeUser(role: string, runId: number): TestUser {
  return {
    name: `${role}-${runId} Автотест`,
    email: `${role}-${runId}@example.com`,
    password: "testpass123",
  };
}

export async function registerUser(page: Page, user: TestUser) {
  await page.goto("/pomidorqa/auth/register");
  await page.getByLabel("Имя").fill(user.name);
  await page.getByLabel("Email").fill(user.email);
  await page.getByLabel("Пароль").fill(user.password);
  await page.getByRole("button", { name: "Зарегистрироваться" }).click();
  await expect(page).toHaveURL(/\/pomidorqa\/?$/);
}

export async function registerUserViaApi(
  request: APIRequestContext,
  user: TestUser,
) {
  const response = await request.post("/api/pomidorqa/test/accounts", {
    data: user,
  });

  if (response.status() !== 201) {
    throw new Error(
      `Регистрация ${user.email} не удалась: ${response.status()} ${await response.text()}`,
    );
  }

  return response.json();
}

export async function deleteUserViaApi(
  request: APIRequestContext,
): Promise<void> {
  const response = await request.delete("/api/pomidorqa/test/accounts");

  if (response.status() !== 200) {
    throw new Error(
      `Удаление аккаунта не удалось: ${response.status()} ${await response.text()}`,
    );
  }
}

export function getTomorrowDate(): string {
  const tomorrow = new Date();

  tomorrow.setDate(tomorrow.getDate() + 1);

  const year = tomorrow.getFullYear();
  const month = String(tomorrow.getMonth() + 1).padStart(2, "0");
  const day = String(tomorrow.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

export function makeSearchData() {
  const runId = Date.now();

  return {
    skill: `HW13-search-${runId}`,
    slotDate: getTomorrowDate(),
    host: makeUser("host", runId),
  };
}

export function makeLoginErrorData() {
  const runId = Date.now();

  return {
    user: makeUser("login-check", runId),
    wrongPassword: "wrong-password",
    unknownEmail: `unknown-${runId}@example.com`,
    unknownPassword: "any-password",
  };
}

export function makeBookingFlowData() {
  const runId = Date.now() + Math.floor(Math.random() * 1_000_000);

  return {
    skillTag: `Playwright-demo-${runId}`,
    host: makeUser("host", runId),
    guest: makeUser("guest", runId),
    guest2: makeUser("guest2", runId),
  };
}

export function makeProfileData() {
  const runId = Date.now();

  return {
    name: `Вика Тестовна${runId}`,
    telegram: `@aqa_vika${runId}`,
    bio: `AQA-инженер, прогон ${runId}. Проверяю форму профиля целиком`,
    testName: `Вика Тестовна ${runId}`,
    testTelegram: `@aqa_vika${runId}`,
    testBio: `AQA-инженер, прогон ${runId}. Пытаюсь разобраться в TS`,
    skillTag: `TS-demo-${runId}`,
    timezone: "Asia/Yekaterinburg",
  };
}

export function makeSkillData() {
  const runId = Date.now();

  return {
    canHelpTag: `CanHelp-${runId}`,
    wantToLearnTag: `WantToLearn-${runId}`,
  };
}