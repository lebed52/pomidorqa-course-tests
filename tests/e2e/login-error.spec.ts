import { test, expect } from '@playwright/test';

// E2E-уровень пирамиды, негативный сценарий: сценарий 10 из списка ДЗ Урока 2.
// requirements.md, п.4: при неверном email ИЛИ пароле участник должен увидеть одну и ту же
// понятную ошибку, без уточнения, что именно неверно, — из соображений безопасности.

test('вход с неверными данными — одинаковая ошибка в обоих случаях, без уточнения причины', async ({
  page,
}) => {
  const runId = Date.now();
  const user = {
    name: `LoginCheck Автотест`,
    email: `login-check-${runId}@example.com`,
    password: 'correct-password-123',
  };

  await test.step('Заводим реальный аккаунт для проверки', async () => {
    await page.goto('/pomidorqa/auth/register');
    await page.getByLabel('Имя').fill(user.name);
    await page.getByLabel('Email').fill(user.email);
    await page.getByLabel('Пароль').fill(user.password);
    await page.getByRole('button', { name: 'Зарегистрироваться' }).click();
    await expect(page).toHaveURL(/\/pomidorqa\/?$/);
  });

  let wrongPasswordError = '';
  await test.step('Пробуем войти с верным email, но неверным паролем', async () => {
    await page.goto('/pomidorqa/auth/login');
    await page.getByLabel('Email').fill(user.email);
    await page.getByLabel('Пароль').fill('wrong-password');
    await page.getByRole('button', { name: 'Войти' }).click();
    const error = page.getByText('Неверный');
    await expect(error).toBeVisible();
    wrongPasswordError = (await error.textContent())?.trim() ?? '';
  });

  let unknownEmailError = '';
  await test.step('Пробуем войти с несуществующим email', async () => {
    await page.goto('/pomidorqa/auth/login');
    await page.getByLabel('Email').fill(`no-such-user-${runId}@example.com`);
    await page.getByLabel('Пароль').fill('any-password-123');
    await page.getByRole('button', { name: 'Войти' }).click();
    const error = page.getByText('Неверный');
    await expect(error).toBeVisible();
    unknownEmailError = (await error.textContent())?.trim() ?? '';
  });

  await test.step('Проверяем: текст ошибки одинаковый в обоих случаях — не раскрывает, что именно неверно', async () => {
    expect(wrongPasswordError).toBe(unknownEmailError);
    expect(wrongPasswordError).toContain('Неверный');
  });
});
