export const ROUTES = {
  home: "/pomidorqa",
  register: "/pomidorqa/auth/register",
  profile: "/pomidorqa/profile",
} as const;

export type Routes = typeof ROUTES;
export type RouteKeys = keyof Routes;