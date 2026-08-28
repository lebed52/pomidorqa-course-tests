export const ROUTES = {
    register: "/pomidorqa/auth/register",
    profile: "/pomidorqa/profile",
};

export type TestUser = {
    name: string;
    email: string;
    password: string;
};

export function makeUser(role: string, runId: number): TestUser {
    return {
        name: `${role} Автотест`,
        email: `${role}-${runId}@example.com`,
        password: "testpass123",
    };
}
