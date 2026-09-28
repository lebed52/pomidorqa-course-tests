import { expect, type Page } from "@playwright/test";

const registerNameInput = (page: Page) => page.locator('#pomidorqa-register-name')
const registerEmailInput = (page: Page) => page.locator('#pomidorqa-register-email')
const registerPasswordInput = (page: Page) => page.locator('#pomidorqa-register-password')
const registerSubmitButton = (page: Page) => page.getByRole('button', { name: 'Зарегистрироваться' })

const bokingCalendarDay = (page: Page) => page.getByRole("group", { name: "Дни со слотами" }).getByRole("button")
const bokingCalendarTime = (page: Page) => page.getByRole("group", { name: "Время слотов" }).getByRole("button")
const bokingModal = (page: Page) => page.getByRole("dialog")

export const ROUTES = {
  profile: "/pomidorqa/profile",
  mySlots: "/pomidorqa/profile/slots",
  bookings: "/pomidorqa/bookings",
  register: "/pomidorqa/auth/register",
  pomidorqa: "/pomidorqa",
}

export type TestUser = {
    name: string;
    email: string;
    password: string;
  };

  export function makeUser(role:string, runId:number): TestUser {
    
    return {
      name: `${role} na pive`, 
      email: `${role}-${runId}@example.com`,
      password: "password123",
    };
  }  

  export async function registerUser(page: Page, user: TestUser) {
    await page.goto(ROUTES.register);
    await registerNameInput(page).fill(user.name);
    await registerEmailInput(page).fill(user.email);
    await registerPasswordInput(page).fill(user.password);
    await registerSubmitButton(page).click();
    await expect(page).toHaveURL(/\/pomidorqa\/?$/);
  }

  export function changeUserName(oldName: string) {
    return {
        newName: `${oldName}-${Date.now()}`,
    };
}  

export async function openBookingModal(page: Page) {
    await expect(async () => {
      const dayChip = bokingCalendarDay(page).first();
      if (!(await dayChip.isVisible().catch(() => false))) {
        await page.reload();
      }
      await expect(dayChip).toBeVisible();
    }).toPass({ timeout: 10_000 });
  
    const day = bokingCalendarDay(page).first();
    const time = bokingCalendarTime(page).first();
  
    if ((await day.getAttribute("aria-pressed")) !== "true") {
      await day.click();
    }
    await expect(time).toBeVisible();
  
    await expect(async () => {
      if (!(await bokingModal(page).isVisible().catch(() => false))) {
        await time.click();
      }
      await expect(bokingModal(page)).toBeVisible();
    }).toPass({ timeout: 10_000 });
  }
  