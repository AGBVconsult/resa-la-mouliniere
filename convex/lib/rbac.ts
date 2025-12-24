import type { QueryCtx, MutationCtx } from "../_generated/server";
import { Errors } from "./errors";

export type Role = "staff" | "admin" | "owner";

const ROLE_HIERARCHY: Record<Role, number> = {
  staff: 1,
  admin: 2,
  owner: 3,
};

function isRole(value: unknown): value is Role {
  return value === "staff" || value === "admin" || value === "owner";
}

export function getRoleFromIdentity(identity: unknown): Role {
  // NON-SPÉCIFIÉ: The exact Clerk claim path for roles is not specified in spec/CONTRACTS.md.
  // We accept common locations to avoid drift between environments.
  const anyId = identity as any;

  const candidates = [
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

  // Default to least privileged if no role claim is present.
  return "staff";
}

export async function getUserRole(ctx: QueryCtx | MutationCtx): Promise<Role> {
  const identity = await ctx.auth.getUserIdentity();
  if (!identity) {
    throw Errors.UNAUTHORIZED();
  }
  return getRoleFromIdentity(identity);
}

export async function requireRole(ctx: QueryCtx | MutationCtx, minRole: Role): Promise<Role> {
  const userRole = await getUserRole(ctx);
  if (ROLE_HIERARCHY[userRole] < ROLE_HIERARCHY[minRole]) {
    throw Errors.FORBIDDEN(minRole, userRole);
  }
  return userRole;
}
