#!/usr/bin/env node
/**
 * Génère la clé RSA de signature des jetons Convex.
 *
 * Usage : node scripts/generate-convex-auth-key.mjs
 *
 * Copier la valeur imprimée dans la variable d'environnement
 * CONVEX_AUTH_PRIVATE_KEY de l'application Next.js (Vercel : tous les
 * environnements concernés). La clé publique est dérivée automatiquement et
 * publiée sur /.well-known/jwks.json ; rien à configurer côté Convex hormis
 * CONVEX_AUTH_ISSUER.
 *
 * Ne jamais committer la valeur produite.
 */
import { generateKeyPairSync } from "node:crypto";

const { privateKey } = generateKeyPairSync("rsa", { modulusLength: 2048 });
const pem = privateKey.export({ type: "pkcs8", format: "pem" }).toString();

console.log("CONVEX_AUTH_PRIVATE_KEY (une seule ligne, sauts de ligne encodés \\n) :\n");
console.log(pem.trim().replace(/\n/g, "\\n"));
console.log("\nCONVEX_AUTH_ISSUER : origine publique de l'application, sans slash final, identique côté Next.js et Convex.");
