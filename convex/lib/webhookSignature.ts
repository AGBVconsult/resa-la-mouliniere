/**
 * Vérification de signature des webhooks Resend (format Svix).
 *
 * En-têtes : `svix-id`, `svix-timestamp` (secondes Unix), `svix-signature`
 * (une ou plusieurs signatures `v1,<base64>` séparées par des espaces).
 * Contenu signé : `${id}.${timestamp}.${corps brut}`, HMAC-SHA256 avec le
 * secret `whsec_<base64>`.
 *
 * Fonction pure (Web Crypto), testable hors runtime Convex.
 */

export const DEFAULT_TOLERANCE_SECONDS = 5 * 60;

export type SvixHeaders = {
  id: string | null;
  timestamp: string | null;
  signature: string | null;
};

export type VerifyResult =
  | { ok: true }
  | { ok: false; reason: "missing-headers" | "bad-secret" | "timestamp" | "signature" };

function base64ToBytes(b64: string): Uint8Array<ArrayBuffer> {
  const bin = atob(b64);
  const out = new Uint8Array(new ArrayBuffer(bin.length));
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}

function bytesToBase64(bytes: ArrayBuffer): string {
  let bin = "";
  for (const b of new Uint8Array(bytes)) bin += String.fromCharCode(b);
  return btoa(bin);
}

/** Comparaison en temps constant de deux chaînes. */
function timingSafeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

export async function signSvix(secret: string, id: string, timestamp: string, body: string): Promise<string> {
  const raw = secret.startsWith("whsec_") ? secret.slice("whsec_".length) : secret;
  const key = await crypto.subtle.importKey(
    "raw",
    base64ToBytes(raw),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );
  const data = new TextEncoder().encode(`${id}.${timestamp}.${body}`);
  return bytesToBase64(await crypto.subtle.sign("HMAC", key, data));
}

export async function verifySvixSignature(args: {
  secret: string | undefined;
  headers: SvixHeaders;
  body: string;
  nowSeconds?: number;
  toleranceSeconds?: number;
}): Promise<VerifyResult> {
  const { id, timestamp, signature } = args.headers;
  if (!id || !timestamp || !signature) return { ok: false, reason: "missing-headers" };
  if (!args.secret || args.secret.length < 16) return { ok: false, reason: "bad-secret" };

  const ts = Number(timestamp);
  const now = args.nowSeconds ?? Math.floor(Date.now() / 1000);
  const tolerance = args.toleranceSeconds ?? DEFAULT_TOLERANCE_SECONDS;
  if (!Number.isFinite(ts) || Math.abs(now - ts) > tolerance) return { ok: false, reason: "timestamp" };

  let expected: string;
  try {
    expected = await signSvix(args.secret, id, timestamp, args.body);
  } catch {
    return { ok: false, reason: "bad-secret" };
  }

  for (const part of signature.split(" ")) {
    const [version, sig] = part.split(",", 2);
    if (version === "v1" && sig && timingSafeEqual(sig, expected)) return { ok: true };
  }
  return { ok: false, reason: "signature" };
}
