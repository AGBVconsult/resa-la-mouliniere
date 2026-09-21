/**
 * Server-only helpers: mint the RS256 JWT that authenticates the admin session
 * against Convex, and publish the matching public key as a JWKS.
 *
 * Why: NextAuth session cookies are encrypted (JWE) and cannot be verified by
 * Convex. Convex supports a `customJwt` provider validated against a JWKS URL,
 * so the app signs its own short-lived tokens (see `convex/auth.config.ts`).
 *
 * Environment:
 *   CONVEX_JWT_PRIVATE_KEY  RSA private key, PKCS#8 PEM. Either the raw PEM
 *                           (newlines may be escaped as "\n") or its base64
 *                           encoding. Generate with `node scripts/generate-convex-jwt-key.mjs`.
 *   CONVEX_AUTH_ISSUER      Public origin of the app (https://…), identical to the
 *                           value set on the Convex deployment. Falls back to
 *                           AUTH_URL / NEXTAUTH_URL.
 */

import { createPublicKey } from "node:crypto";
import { SignJWT, importPKCS8 } from "jose";

export const CONVEX_JWT_ALG = "RS256";
export const CONVEX_JWT_AUDIENCE = "convex";
/** Key id published in the JWKS and stamped in every token header. */
export const CONVEX_JWT_KID = "lm-convex-1";
/** Token lifetime. Convex refreshes it through `fetchAccessToken` before expiry. */
export const CONVEX_JWT_TTL_SECONDS = 60 * 60;

export class ConvexJwtConfigError extends Error {}

function loadPrivateKeyPem(): string {
  const raw = process.env.CONVEX_JWT_PRIVATE_KEY?.trim();
  if (!raw) {
    throw new ConvexJwtConfigError("CONVEX_JWT_PRIVATE_KEY is not set");
  }
  if (raw.includes("-----BEGIN")) {
    return raw.replace(/\\n/g, "\n");
  }
  const decoded = Buffer.from(raw, "base64").toString("utf8");
  if (!decoded.includes("-----BEGIN")) {
    throw new ConvexJwtConfigError("CONVEX_JWT_PRIVATE_KEY is neither a PEM nor a base64-encoded PEM");
  }
  return decoded;
}

export function getConvexIssuer(): string {
  const issuer = process.env.CONVEX_AUTH_ISSUER ?? process.env.AUTH_URL ?? process.env.NEXTAUTH_URL;
  if (!issuer) {
    throw new ConvexJwtConfigError("CONVEX_AUTH_ISSUER (or AUTH_URL) is not set");
  }
  return issuer.replace(/\/+$/, "");
}

export interface ConvexTokenClaims {
  /** Stable user id (NextAuth `user.id`). */
  sub: string;
  role: "staff" | "manager" | "admin" | "owner";
  email?: string;
  name?: string;
}

export async function signConvexToken(
  claims: ConvexTokenClaims
): Promise<{ token: string; expiresAt: number }> {
  const key = await importPKCS8(loadPrivateKeyPem(), CONVEX_JWT_ALG);
  const nowSeconds = Math.floor(Date.now() / 1000);
  const exp = nowSeconds + CONVEX_JWT_TTL_SECONDS;

  const token = await new SignJWT({
    role: claims.role,
    ...(claims.email ? { email: claims.email } : {}),
    ...(claims.name ? { name: claims.name } : {}),
  })
    .setProtectedHeader({ alg: CONVEX_JWT_ALG, kid: CONVEX_JWT_KID, typ: "JWT" })
    .setIssuer(getConvexIssuer())
    .setAudience(CONVEX_JWT_AUDIENCE)
    .setSubject(claims.sub)
    .setIssuedAt(nowSeconds)
    .setExpirationTime(exp)
    .sign(key);

  return { token, expiresAt: exp * 1000 };
}

/** Public JWKS derived from the private key (never exposes private material). */
export function getConvexJwks(): { keys: Array<Record<string, unknown>> } {
  const publicKey = createPublicKey(loadPrivateKeyPem());
  const jwk = publicKey.export({ format: "jwk" }) as Record<string, unknown>;
  return {
    keys: [{ ...jwk, alg: CONVEX_JWT_ALG, use: "sig", kid: CONVEX_JWT_KID }],
  };
}
