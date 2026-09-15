import { expect, type Page } from "@playwright/test";

export const timezones = {
  EKATERINBURG: "Asia/Yekaterinburg",
  MOSCOW: "Europe/Moscow",
  LONDON: "Europe/London",
} as const;

// Регистрация
const registerNameInput = (page: Page) => page.getByLabel("Имя");
const registerEmailInput = (page: Page) => page.getByLabel("Email");
const registerPasswordInput = (page: Page) => page.getByLabel("Пароль");
const registerSubmitButton = (page: Page) => page.getByRole("button", { name: "Зарегистрироваться" });

export type TestUser = {
  name: string;
  email: string;
  password: string;
};

export function makeUser(role: string, runId: string | number): TestUser {
  return {
    name: `${role} Автотест`,
    email: `${role}-${String(runId)}@example.com`,
    password: "testpass123",
  };
}

function parseSessionCookie(headerValue: string | string[] | undefined): { name: string; value: string; domain: string; path: string; httpOnly: boolean; secure: boolean; sameSite: "Lax" | "Strict" | "None" } | null {
  const raw = Array.isArray(headerValue) ? headerValue.join(",") : headerValue;
  if (!raw) return null;

  const pairs = raw.split(";").map((part) => part.trim());
  const cookiePair = pairs.find((part) => part.includes("=") && !part.toLowerCase().includes("path") && !part.toLowerCase().includes("domain") && !part.toLowerCase().includes("expires") && !part.toLowerCase().includes("samesite") && !part.toLowerCase().includes("secure") && !part.toLowerCase().includes("httponly"));

  if (!cookiePair) return null;

  const [name, ...valueParts] = cookiePair.split("=");
  const value = valueParts.join("=");

  if (!name || !value) return null;

  const hasDomain = pairs.some((part) => part.toLowerCase().startsWith("domain="));
  const hasPath = pairs.some((part) => part.toLowerCase().startsWith("path="));
  const domain = hasDomain ? pairs.find((part) => part.toLowerCase().startsWith("domain="))?.slice("domain=".length) ?? "aiqa.su" : "aiqa.su";
  const path = hasPath ? pairs.find((part) => part.toLowerCase().startsWith("path="))?.slice("path=".length) ?? "/" : "/";
  const sameSiteFlag = pairs.find((part) => part.toLowerCase().startsWith("samesite="));
  const sameSite = sameSiteFlag ? (sameSiteFlag.slice("samesite=".length).toLowerCase() === "strict" ? "Strict" : sameSiteFlag.slice("samesite=".length).toLowerCase() === "none" ? "None" : "Lax") : "Lax";

  return {
    name,
    value,
    domain,
    path,
    httpOnly: pairs.some((part) => part.toLowerCase() === "httponly"),
    secure: pairs.some((part) => part.toLowerCase() === "secure"),
    sameSite,
  };
}

export async function registerUserViaApi(page: Page, user: TestUser) {
  const apiContext = await page.context().request;
  const response = await apiContext.post("/pomidorqa/auth/register", {
    form: {
      name: user.name,
      email: user.email,
      password: user.password,
    },
    headers: {
      Origin: "https://aiqa.su",
      Referer: "https://aiqa.su/pomidorqa/auth/register",
      "Content-Type": "application/x-www-form-urlencoded",
    },
    maxRedirects: 0,
  });

  const cookieHeader = response.headers()["set-cookie"] ?? response.headers()["Set-Cookie"];
  const sessionCookie = parseSessionCookie(cookieHeader);

  if (sessionCookie) {
    await page.context().addCookies([
      {
        name: sessionCookie.name,
        value: sessionCookie.value,
        domain: sessionCookie.domain,
        path: sessionCookie.path,
        httpOnly: sessionCookie.httpOnly,
        secure: sessionCookie.secure,
        sameSite: sessionCookie.sameSite,
      },
    ]);
    await page.goto("/pomidorqa");
    await expect(page).toHaveURL(/\/pomidorqa\/?$/, { timeout: 15_000 });
    return;
  }

  await registerUser(page, user);
}

export async function deleteCurrentTestUser(page: Page) {
  const request = page.context().request;
  const candidates = [
    { method: "DELETE", url: "/pomidorqa/api/profile" },
    { method: "DELETE", url: "/pomidorqa/api/user" },
    { method: "DELETE", url: "/api/profile" },
    { method: "DELETE", url: "/api/user" },
    { method: "POST", url: "/pomidorqa/api/profile/delete" },
    { method: "POST", url: "/pomidorqa/api/user/delete" },
    { method: "POST", url: "/api/profile/delete" },
    { method: "POST", url: "/api/user/delete" },
  ] as const;

  for (const candidate of candidates) {
    try {
      const response = await request.fetch(candidate.url, {
        method: candidate.method,
        headers: {
          Accept: "application/json",
          Origin: "https://aiqa.su",
          Referer: "https://aiqa.su/pomidorqa",
        },
      });

      const status = response.status();
      if (status !== 404 && status !== 405) {
        return;
      }
    } catch {
      // Ignore missing cleanup routes; test accounts are short-lived and unique.
    }
  }
}

export async function registerUser(page: Page, user: TestUser) {
  await page.goto("/pomidorqa/auth/register");
  await registerNameInput(page).fill(user.name);
  await registerEmailInput(page).fill(user.email);
  await registerPasswordInput(page).fill(user.password);
  await registerSubmitButton(page).click();
  await expect(page).toHaveURL(/\/pomidorqa\/?$/, { timeout: 15_000 });
}

