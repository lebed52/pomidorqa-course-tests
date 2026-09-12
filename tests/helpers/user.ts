import { expect, type Page } from "@playwright/test";
import { RegisterPage } from "../pages/register-page";

export const ROUTES = {
    register: "/pomidorqa/auth/register",
    profile: "/pomidorqa/profile",
    slots: "/pomidorqa/profile/slots",
    bookings: "/pomidorqa/bookings",
    catalog: "/pomidorqa",
};

export type TestUser = {
    name: string;
    email: string;
    password: string;
};

export function makeUser(role: string, runId: number = Date.now()): TestUser {
    const uniqueHash = Math.floor(Math.random() * 1_000_000);
    return {
        name: `${role} Автотест ${runId}-${uniqueHash}`,
        email: `${role}-${runId}-${uniqueHash}@example.com`,
        password: "testpass123",
    };
}

export async function registerUser(page: Page, user: TestUser) {
    const registerPage = new RegisterPage(page);
    await page.goto(ROUTES.register);
    await registerPage.submitRegistrationForm(user.name, user.email, user.password);
    await expect(page).toHaveURL(/\/pomidorqa\/?$/);
}
