import type { QueryCtx, MutationCtx } from "../_generated/server";

export type Role = "staff" | "manager" | "admin" | "owner";

const ROLE_HIERARCHY: Record<Role, number> = {
  staff: 1,
  manager: 2,
  admin: 3,
  owner: 4,
};

function isRole(value: unknown): value is Role {
  return value === "staff" || value === "manager" || value === "admin" || value === "owner";
}

export function getRoleFromIdentity(identity: unknown): Role {
  const anyId = identity as any;

  const candidates = [
    anyId?.role,
    anyId?.tokenClaims?.role,
    anyId?.claims?.role,
    anyId?.publicMetadata?.role,
    anyId?.privateMetadata?.role,
    anyId?.unsafeMetadata?.role,
    anyId?.customClaims?.role,
  ];

  for (const c of candidates) {
    if (isRole(c)) return c;
  }

  return "staff";
}

export async function getUserRole(_ctx: QueryCtx | MutationCtx): Promise<Role> {
  // Pour une app mono-utilisateur, on retourne toujours "owner"
  // La protection est assurée par le middleware Next.js
  return "owner";
}

export async function requireRole(_ctx: QueryCtx | MutationCtx, _minRole: Role): Promise<Role> {
  // Pour une app mono-utilisateur, on retourne toujours "owner"
  // La protection est assurée par le middleware Next.js
  return "owner";
}
