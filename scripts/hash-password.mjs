#!/usr/bin/env node
/**
 * Generate the AUTH_PASSWORD_HASH value expected by src/auth.ts.
 *
 *   node scripts/hash-password.mjs            # prompts for the password
 *   node scripts/hash-password.mjs 'secret'   # non-interactive (avoid in shell history)
 *
 * Output format: pbkdf2$<iterations>$<salt-b64>$<hash-b64>
 */
import { webcrypto } from "node:crypto";
import { createInterface } from "node:readline/promises";
import { stdin, stdout } from "node:process";

const ITERATIONS = 310_000;
const SALT_BYTES = 16;
const HASH_BYTES = 32;

async function hashPassword(password) {
  const salt = webcrypto.getRandomValues(new Uint8Array(SALT_BYTES));
  const key = await webcrypto.subtle.importKey("raw", new TextEncoder().encode(password), "PBKDF2", false, ["deriveBits"]);
  const bits = await webcrypto.subtle.deriveBits(
    { name: "PBKDF2", hash: "SHA-256", salt, iterations: ITERATIONS },
    key,
    HASH_BYTES * 8
  );
  const b64 = (bytes) => Buffer.from(bytes).toString("base64");
  return `pbkdf2$${ITERATIONS}$${b64(salt)}$${b64(new Uint8Array(bits))}`;
}

let password = process.argv[2];
if (!password) {
  const rl = createInterface({ input: stdin, output: stdout });
  password = await rl.question("Mot de passe admin : ");
  rl.close();
}
if (!password || password.length < 12) {
  console.error("Le mot de passe doit contenir au moins 12 caractères.");
  process.exit(1);
}

console.log("\nAUTH_PASSWORD_HASH=" + (await hashPassword(password)));
console.log("\nCopiez cette valeur dans les variables d'environnement Vercel, puis supprimez AUTH_PASSWORD.");
