import { expect, type Page } from "@playwright/test";
import { ProfilePage } from "../pages/profile-page";
import { SlotsPage } from "../pages/slots-page";

export const ROUTES = {
  home: "/pomidorqa",
  register: "/pomidorqa/auth/register",
  login: "/pomidorqa/auth/login",
  profile: "/pomidorqa/profile",
  slots: "/pomidorqa/profile/slots",
  booking: "/pomidorqa/bookings",
};

export const UTC_CONTEXT_OPTIONS = {
  timezoneId: "UTC",
};

export type TestUser = {
  name: string;
  email: string;
  password: string;
};

function randomSuffix(): string {
  return Math.random().toString(36).slice(2, 6);
}

export function makeUser(role: string, runId: number): TestUser {
  return {
    name: `${role}-${runId} Автотест`,
    email: `${role}-${runId}-${randomSuffix()}@example.com`,
    password: "testpass123",
  };
}

export function makeRandom(prefix: string) {
  return `${prefix}-${Date.now()}-${randomSuffix()}`;
}

export async function registerUser(page: Page, user: TestUser) {
  const registerNameInput = (page: Page) => page.getByLabel("Имя");
  const registerEmailInput = (page: Page) => page.getByLabel("Email");
  const registerPasswordInput = (page: Page) => page.getByLabel("Пароль");
  const registerSubmitButton = (page: Page) =>
    page.getByRole("button", { name: "Зарегистрироваться" });

  await page.goto(ROUTES.register);
  await registerNameInput(page).fill(user.name);
  await registerEmailInput(page).fill(user.email);
  await registerPasswordInput(page).fill(user.password);
  await registerSubmitButton(page).click();
  await expect(page).toHaveURL(/\/pomidorqa\/?$/);
}

export async function prepareHost(
  page: Page,
  user: TestUser,
  skillTag: string,
  slotTime = "12:00",
) {
  await registerUser(page, user);

  const profile = new ProfilePage(page);
  await profile.goto();
  await profile.addSkill(skillTag, "can_help");
  await expect(profile.canHelpSkills).toContainText(skillTag);

  const slots = new SlotsPage(page);
  await slots.goto();
  await slots.addSlot(slotTime);
  await expect(slots.firstSlotCard).toBeVisible();
}

export async function loginUser(page: Page, user: TestUser) {
  const loginEmailInput = (page: Page) => page.getByLabel("Email");
  const loginPasswordInput = (page: Page) => page.getByLabel("Пароль");
  const loginSubmitButton = (page: Page) =>
    page.getByRole("button", { name: "Войти" });

  await page.goto(ROUTES.login);
  await loginEmailInput(page).fill(user.email);
  await loginPasswordInput(page).fill(user.password);
  await loginSubmitButton(page).click();
  await expect(page).toHaveURL(/\/pomidorqa\/?$/);
}
