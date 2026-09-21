import { describe, expect, test } from "vitest";
import { computeSvixSignature, verifySvixSignature } from "../convex/lib/svix";

// Random-looking but fixed secret (24 bytes base64) — test fixture only.
const SECRET = "whsec_MfKQ9r8GKYqrTwjUPD8ILPZIo2LaLaSw";
const BODY = JSON.stringify({ from: "client@example.com", text: "Bonjour" });
const MSG_ID = "msg_2Xq9uL3v";
const NOW_MS = 1_760_000_000_000;
const TS = String(Math.floor(NOW_MS / 1000));

async function signedHeaders(body = BODY, ts = TS, id = MSG_ID) {
  const sig = await computeSvixSignature(SECRET, id, ts, body);
  return { id, timestamp: ts, signature: `v1,${sig}` };
}

describe("verifySvixSignature", () => {
  test("accepts a correctly signed payload", async () => {
    const headers = await signedHeaders();
    expect(await verifySvixSignature(headers, BODY, SECRET, NOW_MS)).toBe(true);
  });

  test("accepts when one of several signatures matches", async () => {
    const good = await signedHeaders();
    const headers = { ...good, signature: `v1,AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA= ${good.signature}` };
    expect(await verifySvixSignature(headers, BODY, SECRET, NOW_MS)).toBe(true);
  });

  test("rejects a tampered body", async () => {
    const headers = await signedHeaders();
    const tampered = JSON.stringify({ from: "attacker@example.com", text: "Bonjour" });
    expect(await verifySvixSignature(headers, tampered, SECRET, NOW_MS)).toBe(false);
  });

  test("rejects a wrong secret", async () => {
    const headers = await signedHeaders();
    expect(await verifySvixSignature(headers, BODY, "whsec_AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA", NOW_MS)).toBe(false);
  });

  test("rejects missing headers", async () => {
    expect(await verifySvixSignature({ id: null, timestamp: TS, signature: "v1,x" }, BODY, SECRET, NOW_MS)).toBe(false);
    expect(await verifySvixSignature({ id: MSG_ID, timestamp: null, signature: "v1,x" }, BODY, SECRET, NOW_MS)).toBe(false);
    expect(await verifySvixSignature({ id: MSG_ID, timestamp: TS, signature: null }, BODY, SECRET, NOW_MS)).toBe(false);
  });

  test("rejects a stale timestamp (replay protection)", async () => {
    const headers = await signedHeaders();
    const sixMinutesLater = NOW_MS + 6 * 60 * 1000;
    expect(await verifySvixSignature(headers, BODY, SECRET, sixMinutesLater)).toBe(false);
  });

  test("rejects unsupported signature versions", async () => {
    const good = await signedHeaders();
    const headers = { ...good, signature: good.signature.replace("v1,", "v2,") };
    expect(await verifySvixSignature(headers, BODY, SECRET, NOW_MS)).toBe(false);
  });
});
