import "server-only";
import { importPKCS8, exportJWK, calculateJwkThumbprint, type JWK, type CryptoKey } from "jose";

/**
 * Clé de signature des jetons Convex.
 *
 * Variables d'environnement (Next.js, côté serveur uniquement) :
 *   CONVEX_AUTH_PRIVATE_KEY  clé privée RSA au format PKCS#8 PEM. Les sauts de
 *                            ligne peuvent être encodés `\n` (cas Vercel).
 *   CONVEX_AUTH_ISSUER       origine publique de l'application, sans slash final.
 *
 * Génération : `node scripts/generate-convex-auth-key.mjs`.
 */

export const CONVEX_AUDIENCE = "convex";
export const ALGORITHM = "RS256";

export type SigningMaterial = {
  privateKey: CryptoKey;
  publicJwk: JWK;
  kid: string;
  issuer: string;
};

let cached: Promise<SigningMaterial> | null = null;

export function getIssuer(): string {
  const raw = process.env.CONVEX_AUTH_ISSUER;
  if (!raw) {
    throw new Error("CONVEX_AUTH_ISSUER manquant (origine publique de l'application, sans slash final)");
  }
  return raw.replace(/\/+$/, "");
}

async function load(): Promise<SigningMaterial> {
  const raw = process.env.CONVEX_AUTH_PRIVATE_KEY;
  if (!raw) {
    throw new Error("CONVEX_AUTH_PRIVATE_KEY manquant (clé RSA PKCS#8 PEM)");
  }
  const pem = raw.includes("\\n") ? raw.replace(/\\n/g, "\n") : raw;

  const privateKey = await importPKCS8(pem, ALGORITHM);
  const fullJwk = await exportJWK(privateKey);

  // Ne conserver que la partie publique de la clé.
  const publicJwk: JWK = { kty: fullJwk.kty, n: fullJwk.n, e: fullJwk.e, alg: ALGORITHM, use: "sig" };
  const kid = await calculateJwkThumbprint(publicJwk);
  publicJwk.kid = kid;

  return { privateKey, publicJwk, kid, issuer: getIssuer() };
}

export function getSigningMaterial(): Promise<SigningMaterial> {
  if (!cached) {
    cached = load().catch((err) => {
      cached = null;
      throw err;
    });
  }
  return cached;
}
