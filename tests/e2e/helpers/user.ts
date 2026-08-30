import { expect, type Locator, type Page } from '@playwright/test';

export type TestUser = {
  name: string;
  email: string;
  password: string;
};

export function makeUser(role: string, runId: number): TestUser {
  return {
    name: `${role} Автотест`,
    email: `${role}-${runId}@example.com`,
    password: 'testpass123',
  };
}

export function makeUnique(prefix: string) {
  return `${prefix}-${Date.now()}`;
}
