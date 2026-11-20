import { cookies } from "next/headers";

export type Scope = "org" | "system";
export type Role = "director" | "reporter" | "admin";

export interface SessionUser {
  role: Role;
  name: string;
  label: string;
  scope: Scope;
  details: boolean;
  /** Forced su_program restriction for scoped roles, else null. */
  program: string | null;
}

const COOKIE = "sristi_role";

const DEFS: Record<Role, Omit<SessionUser, "role">> = {
  director: {
    name: "Director",
    label: "Senior management",
    scope: "org",
    details: true,
    program: null,
  },
  reporter: {
    name: "Reporting officer",
    label: "Aggregate reporting",
    scope: "org",
    details: false,
    program: null,
  },
  admin: {
    name: "System administrator",
    label: "Platform administration",
    scope: "system",
    details: false,
    program: null,
  },
};

export const ROLES = Object.keys(DEFS) as Role[];

export function isRole(value: unknown): value is Role {
  return typeof value === "string" && (ROLES as string[]).includes(value);
}

export function userFor(role: Role): SessionUser {
  return { role, ...DEFS[role] };
}

/** Public shape returned to the browser (no internal `program` field). */
export function publicUser(u: SessionUser) {
  return {
    role: u.role,
    name: u.name,
    label: u.label,
    scope: u.scope,
    details: u.details,
  };
}

export async function getSession(): Promise<SessionUser | null> {
  const store = await cookies();
  const role = store.get(COOKIE)?.value;
  return isRole(role) ? userFor(role) : null;
}

export async function setSession(role: Role): Promise<void> {
  const store = await cookies();
  store.set(COOKIE, role, {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 30, // 30 minutes
  });
}
