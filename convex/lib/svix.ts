/**
 * Svix webhook signature verification (used by Resend for inbound e-mails).
 * Pure Web Crypto — usable in the Convex runtime and testable under Node.
 * Spec: https://docs.svix.com/receiving/verifying-payloads/how-manual
 */

/** Tolerance on the `svix-timestamp` header (replay protection). */
export const SVIX_TIMESTAMP_TOLERANCE_S = 5 * 60;

export function base64ToBytes(b64: string): Uint8Array<ArrayBuffer> {
  const bin = atob(b64);
  const bytes = new Uint8Array(new ArrayBuffer(bin.length));
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  return bytes;
}

export function bytesToBase64(bytes: Uint8Array): string {
  let bin = "";
  for (const b of bytes) bin += String.fromCharCode(b);
  return btoa(bin);
}

/** Constant-time string comparison (no early exit on mismatch). */
export function constantTimeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

export interface SvixHeaders {
  id: string | null;
  timestamp: string | null;
  signature: string | null;
}

/** Compute the `v1` signature Svix produces for a message. */
export async function computeSvixSignature(
  secret: string,
  msgId: string,
  timestamp: string,
  rawBody: string
): Promise<string> {
  const secretBytes = base64ToBytes(secret.replace(/^whsec_/, ""));
  const key = await crypto.subtle.importKey(
    "raw",
    secretBytes,
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );
  const signed = await crypto.subtle.sign(
    "HMAC",
    key,
    new TextEncoder().encode(`${msgId}.${timestamp}.${rawBody}`)
  );
  return bytesToBase64(new Uint8Array(signed));
}

/**
 * Verify a Svix-signed payload.
 * `nowMs` is injectable for tests; defaults to the current time.
 */
export async function verifySvixSignature(
  headers: SvixHeaders,
  rawBody: string,
  secret: string,
  nowMs: number = Date.now()
): Promise<boolean> {
  const { id: msgId, timestamp, signature: signatureHeader } = headers;
  if (!msgId || !timestamp || !signatureHeader) return false;

  const ts = Number(timestamp);
  if (!Number.isFinite(ts) || Math.abs(nowMs / 1000 - ts) > SVIX_TIMESTAMP_TOLERANCE_S) {
    return false;
  }

  const expected = await computeSvixSignature(secret, msgId, timestamp, rawBody);

  // The header may carry several "v1,<base64>" entries separated by spaces.
  for (const entry of signatureHeader.split(" ")) {
    const [version, sig] = entry.split(",");
    if (version === "v1" && sig && constantTimeEqual(sig, expected)) return true;
  }
  return false;
}
