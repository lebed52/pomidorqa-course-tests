export const ROUTES = {
    register: "/pomidorqa/auth/register",
    profile: "/pomidorqa/profile",
    slots: "/pomidorqa/profile/slots",
    bookings: "/pomidorqa/bookings",
    catalog: "/pomidorqa",
    test: "/api/pomidorqa/test/accounts"
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

export async function registerUserViaApi(api: APIRequestContext, user: TestUser) {
    const response = await api.post(ROUTES.test, {data: user});

    expect(response.status()).toBe(201);
}

export async function deleteCurrentTestUser(api: APIRequestContext) {
    const response = await api.delete(ROUTES.test);
    expect(response.status()).toBe(200);
}

