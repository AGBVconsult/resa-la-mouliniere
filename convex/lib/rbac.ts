import type { Auth } from "convex/server";
import { Errors } from "./errors";

export type Role = "staff" | "manager" | "admin" | "owner";

const ROLE_HIERARCHY: Record<Role, number> = {
  staff: 1,
  manager: 2,
  admin: 3,
  owner: 4,
};

/**
 * Any Convex function context exposes `ctx.auth` (query, mutation, action, http).
 * Kept structural so helpers stay usable from every function kind and from tests.
 */
type AuthCtx = { auth: Auth };

function isRole(value: unknown): value is Role {
  return value === "staff" || value === "manager" || value === "admin" || value === "owner";
}

/**
 * Extract the role from a Convex identity.
 *
 * The admin JWT minted by `/api/convex/token` carries a top-level `role` claim;
 * Convex exposes custom claims directly on the identity object. The other
 * candidates keep compatibility with identity providers that nest claims.
 * Defaults to the least privileged role when no claim is present.
 */
type ClaimsBag = { role?: unknown } & Record<string, { role?: unknown } | unknown>;

export function getRoleFromIdentity(identity: unknown): Role {
  const anyId = identity as
    | (ClaimsBag & {
        tokenClaims?: { role?: unknown };
        claims?: { role?: unknown };
        publicMetadata?: { role?: unknown };
        privateMetadata?: { role?: unknown };
        unsafeMetadata?: { role?: unknown };
        customClaims?: { role?: unknown };
      })
    | null
    | undefined;

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

/**
 * Role of the caller, or `null` when the request carries no valid identity.
 */
export async function getUserRole(ctx: AuthCtx): Promise<Role | null> {
  const identity = await ctx.auth.getUserIdentity();
  if (!identity) return null;
  return getRoleFromIdentity(identity);
}

/**
 * Require an authenticated caller whose role is at least `minRole`.
 *
 * Throws `FORBIDDEN` (`error.unauthorized`) without identity and
 * `FORBIDDEN` (`error.forbidden`) when the role is insufficient.
 * The identity is validated by Convex against the JWKS declared in
 * `convex/auth.config.ts`; nothing here trusts client-supplied data.
 */
export async function requireRole(ctx: AuthCtx, minRole: Role): Promise<Role> {
  const identity = await ctx.auth.getUserIdentity();
  if (!identity) {
    throw Errors.UNAUTHORIZED();
  }

  const role = getRoleFromIdentity(identity);
  if (ROLE_HIERARCHY[role] < ROLE_HIERARCHY[minRole]) {
    throw Errors.FORBIDDEN(minRole, role);
  }

  return role;
}
