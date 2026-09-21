#!/usr/bin/env node
/**
 * Generate the RSA key pair used to sign the Convex admin tokens.
 *
 *   node scripts/generate-convex-jwt-key.mjs
 *
 * Prints CONVEX_JWT_PRIVATE_KEY (base64-encoded PKCS#8 PEM, single line, safe
 * for Vercel / .env files). Only the private key needs to be stored: the public
 * JWKS served at /api/convex/jwks is derived from it at runtime.
 *
 * Rotation: generate a new key, deploy it, then restart Convex clients
 * (tokens are valid 1 h; Convex caches the JWKS for a short while).
 */
import { generateKeyPairSync } from "node:crypto";

const { privateKey } = generateKeyPairSync("rsa", {
  modulusLength: 2048,
  privateKeyEncoding: { type: "pkcs8", format: "pem" },
  publicKeyEncoding: { type: "spki", format: "pem" },
});

const base64 = Buffer.from(privateKey, "utf8").toString("base64");

console.log("CONVEX_JWT_PRIVATE_KEY=" + base64);
console.log("\nÀ définir dans Vercel (et .env.local en développement).");
console.log("Ne jamais committer cette valeur.");
