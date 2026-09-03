import { test, expect, type Locator } from '@playwright/test';
import { makeUser, registerUser, loginUser, type TestUser } from '../helpers/user';

test.describe('Вход с неверными данными', () => {
  let user: TestUser;
  let runId: number;
  let errorMessage: Locator;

  test.beforeEach(async ({ page }) => {
    runId = Date.now();
    user = makeUser('login-check', runId);
    await registerUser(page, user);
    errorMessage = page.getByText('Неверный');
  });

  test('вход с неверными данными — одинаковая ошибка в обоих случаях, без уточнения причины', async ({
    page,
  }) => {
    let wrongPasswordError = '';
    let unknownEmailError = '';

    await test.step('Пробуем войти с верным email, но неверным паролем', async () => {
      await loginUser(page, user.email, 'wrong-password');
      await expect(errorMessage).toBeVisible();
      wrongPasswordError = (await errorMessage.textContent())?.trim() ?? '';
    });

    await test.step('Пробуем войти с несуществующим Email', async () => {
      await loginUser(page, `no-such-user-${runId}@example.com`, 'any-password-123');
      await expect(errorMessage).toBeVisible();
      unknownEmailError = (await errorMessage.textContent())?.trim() ?? '';
    });

    await test.step('Проверяем: текст ошибки одинаковый в обоих случаях — не раскрывает, что именно неверно', async () => {
      expect(wrongPasswordError).toBe(unknownEmailError);
      expect(wrongPasswordError).toContain('Неверный');
    });
  });
});
