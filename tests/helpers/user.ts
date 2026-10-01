import { expect, type APIRequestContext, type BrowserContext, type Page } from "@playwright/test";

const bokingCalendarDay = (page: Page) => page.getByRole("group", { name: "Дни со слотами" }).getByRole("button")
const bokingCalendarTime = (page: Page) => page.getByRole("group", { name: "Время слотов" }).getByRole("button")
const bokingModal = (page: Page) => page.getByRole("dialog")

const TEST_ACCOUNTS_ENDPOINT = "/api/pomidorqa/test/accounts";

export const ROUTES = {
  profile: "/pomidorqa/profile",
  mySlots: "/pomidorqa/profile/slots",
  bookings: "/pomidorqa/bookings",
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

  // Сервер ставит сессию в cookie того же браузерного контекста, что и page.
  export async function registerUserViaApi(page: Page, user: TestUser) {
    const response = await page.request.post(TEST_ACCOUNTS_ENDPOINT, {
      data: {
        name: user.name,
        email: user.email,
        password: user.password,
      },
    });
    if (response.status() !== 201) {
      throw new Error(`Регистрация не удалась: ${response.status()} ${await response.text()}`);
    }
    await page.goto(ROUTES.pomidorqa);
  }

  // Сессия берётся из cookie того же контекста, который регистрировал пользователя.
  // Вместе с аккаунтом сервер удаляет навыки, слоты и бронирования.
  export async function deleteUserViaApi(request: APIRequestContext): Promise<void> {
    const response = await request.delete(TEST_ACCOUNTS_ENDPOINT);
    if (response.status() !== 200) {
      throw new Error(`Удаление аккаунта не удалось: ${response.status()} ${await response.text()}`);
    }
  }

  export async function cleanupUsersViaApi(contexts: BrowserContext[]): Promise<void> {
    await Promise.all(
      contexts.map(async (context) => {
        try {
          await deleteUserViaApi(context.request);
        } catch (reason) {
          console.warn("Не удалось удалить тестового участника:", reason);
        }
        try {
          await context.close();
        } catch (reason) {
          console.warn("Браузерный контекст уже закрыт:", reason);
        }
      })
    );
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
  