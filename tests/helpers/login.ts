import { expect } from "@playwright/test";

export function expectSameLoginError(
  firstError: string,
  secondError: string,
) {
  expect(firstError).toBe(secondError);
  expect(firstError).toContain("Неверный");
}