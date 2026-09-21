import { test, expect, type Page } from "@playwright/test";

// E2E-уровень пирамиды, негативный сценарий регистрации.
// API-уровень (tests/api/booking-api.spec.ts) уже проверяет 409 email_taken на backend,
// здесь проверяем, что ошибка доходит до пользователя в интерфейсе, а не теряется молча.

const registerNameInput = (page: Page) => page.getByLabel("Имя");
const registerEmailInput = (page: Page) => page.getByLabel("Email");
const registerPasswordInput = (page: Page) => page.getByLabel("Пароль");
const registerSubmitButton = (page: Page) => page.getByRole("button", { name: "Зарегистрироваться" });

async function fillRegisterForm(page: Page, name: string, email: string, password: string) {
  await page.goto("/pomidorqa/auth/register");
  await registerNameInput(page).fill(name);
  await registerEmailInput(page).fill(email);
  await registerPasswordInput(page).fill(password);
  await registerSubmitButton(page).click();
}

test("повторная регистрация с уже занятым email — пользователь видит ошибку, а не переходит дальше", async ({
  page,
}) => {
  const runId = Date.now();
  const email = `dup-check-${runId}@example.com`;

  await test.step("Регистрируем первый аккаунт с этим email", async () => {
    await fillRegisterForm(page, "Dup Check One", email, "testpass123");
    await expect(page).toHaveURL(/\/pomidorqa\/?$/);
  });

  await test.step("Пробуем зарегистрировать второй аккаунт с тем же email", async () => {
    await fillRegisterForm(page, "Dup Check Two", email, "testpass456");
  });

  await test.step("Видим понятную ошибку и остаёмся на странице регистрации", async () => {
    await expect(page.getByText(/уже зарегистрирован/)).toBeVisible();
    await expect(page).toHaveURL(/\/pomidorqa\/auth\/register$/);
  });
});
