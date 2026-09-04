import type { Auth } from "convex/server";
import { Errors } from "./errors";

/**
 * RBAC — contrôle d'accès des fonctions Convex.
 *
 * L'identité provient d'un JWT émis par l'application Next.js (NextAuth)
 * et vérifié par Convex via `convex/auth.config.ts` (fournisseur `customJwt`).
 * Le rôle est porté par la claim `role` du JWT.
 *
 * Toute fonction publique d'administration DOIT appeler `requireRole` en
 * première instruction. Les fonctions publiques sans garde sont limitées à la
 * liste `PUBLIC_FUNCTIONS` (vérifiée par tests/authSurface.spec.ts).
 *
 * Coupe-circuit : `CONVEX_AUTH_ENFORCEMENT=off` (variable d'environnement du
 * déploiement Convex) désactive le contrôle. À réserver au développement local
 * et à un retour arrière d'urgence ; ne jamais laisser actif en production.
 */

export type Role = "staff" | "manager" | "admin" | "owner";

const ROLE_HIERARCHY: Record<Role, number> = {
  staff: 1,
  manager: 2,
  admin: 3,
  owner: 4,
};

/** Contexte minimal accepté : query, mutation ou action (tous exposent `auth`). */
export type AuthCtx = { auth: Auth };

function isRole(value: unknown): value is Role {
  return value === "staff" || value === "manager" || value === "admin" || value === "owner";
}

/**
 * Extrait le rôle d'une identité Convex.
 * Convex expose les claims personnalisées du JWT comme propriétés de premier
 * niveau de `UserIdentity` ; les autres chemins couvrent d'anciens fournisseurs.
 * Un JWT sans rôle est traité comme `staff` (droits minimaux).
 */
export function getRoleFromIdentity(identity: unknown): Role {
  const anyId = identity as Record<string, unknown> | null | undefined;

  const candidates = [
    anyId?.role,
    (anyId?.tokenClaims as Record<string, unknown> | undefined)?.role,
    (anyId?.claims as Record<string, unknown> | undefined)?.role,
    (anyId?.publicMetadata as Record<string, unknown> | undefined)?.role,
  ];

  for (const c of candidates) {
    if (isRole(c)) return c;
  }

  return "staff";
}

let enforcementWarningLogged = false;

/** Vrai quand le coupe-circuit est activé sur le déploiement. */
export function isEnforcementDisabled(): boolean {
  const disabled = process.env.CONVEX_AUTH_ENFORCEMENT === "off";
  if (disabled && !enforcementWarningLogged) {
    enforcementWarningLogged = true;
    console.warn(
      "[rbac] CONVEX_AUTH_ENFORCEMENT=off : contrôle d'accès DÉSACTIVÉ. Toute fonction admin est ouverte."
    );
  }
  return disabled;
}

/**
 * Rôle de l'appelant, ou `null` s'il n'est pas authentifié.
 */
export async function getUserRole(ctx: AuthCtx): Promise<Role | null> {
  if (isEnforcementDisabled()) return "owner";
  const identity = await ctx.auth.getUserIdentity();
  if (!identity) return null;
  return getRoleFromIdentity(identity);
}

/**
 * Exige un rôle minimal. Lève `FORBIDDEN` (code contractuel) si l'appelant
 * n'est pas authentifié ou si son rôle est insuffisant.
 */
export async function requireRole(ctx: AuthCtx, minRole: Role): Promise<Role> {
  if (isEnforcementDisabled()) return "owner";

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
