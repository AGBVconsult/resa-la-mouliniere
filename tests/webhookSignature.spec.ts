import { describe, expect, test } from "vitest";
import { signSvix, verifySvixSignature } from "../convex/lib/webhookSignature";

// Secret de test au format Svix (base64 de 24 octets), sans valeur réelle.
const SECRET = "whsec_" + Buffer.from("test-secret-for-unit-tests-only").toString("base64");
const BODY = JSON.stringify({ type: "email.received", data: { from: "Jean <jean@example.test>", text: "Bonjour" } });
const NOW = 1_800_000_000;

async function headersFor(body: string, ts = String(NOW), secret = SECRET) {
  const id = "msg_test";
  const sig = await signSvix(secret, id, ts, body);
  return { id, timestamp: ts, signature: `v1,${sig}` };
}

describe("verifySvixSignature", () => {
  test("accepte une signature valide", async () => {
    const headers = await headersFor(BODY);
    await expect(verifySvixSignature({ secret: SECRET, headers, body: BODY, nowSeconds: NOW })).resolves.toEqual({ ok: true });
  });

  test("accepte plusieurs signatures dont une valide (rotation)", async () => {
    const good = await headersFor(BODY);
    const headers = { ...good, signature: `v1,AAAA v1,${good.signature.slice(3)}` };
    await expect(verifySvixSignature({ secret: SECRET, headers, body: BODY, nowSeconds: NOW })).resolves.toEqual({ ok: true });
  });

  test("refuse un corps modifié", async () => {
    const headers = await headersFor(BODY);
    const tampered = BODY.replace("Bonjour", "Annulez ma réservation");
    await expect(verifySvixSignature({ secret: SECRET, headers, body: tampered, nowSeconds: NOW })).resolves.toEqual({
      ok: false,
      reason: "signature",
    });
  });

  test("refuse un mauvais secret", async () => {
    const headers = await headersFor(BODY, String(NOW), "whsec_" + Buffer.from("another-secret-value-here").toString("base64"));
    await expect(verifySvixSignature({ secret: SECRET, headers, body: BODY, nowSeconds: NOW })).resolves.toEqual({
      ok: false,
      reason: "signature",
    });
  });

  test("refuse un horodatage hors tolérance (rejeu)", async () => {
    const old = String(NOW - 10 * 60);
    const headers = await headersFor(BODY, old);
    await expect(verifySvixSignature({ secret: SECRET, headers, body: BODY, nowSeconds: NOW })).resolves.toEqual({
      ok: false,
      reason: "timestamp",
    });
  });

  test("refuse les en-têtes manquants et un secret absent (fail closed)", async () => {
    await expect(
      verifySvixSignature({ secret: SECRET, headers: { id: null, timestamp: null, signature: null }, body: BODY, nowSeconds: NOW })
    ).resolves.toEqual({ ok: false, reason: "missing-headers" });
    const headers = await headersFor(BODY);
    await expect(verifySvixSignature({ secret: undefined, headers, body: BODY, nowSeconds: NOW })).resolves.toEqual({
      ok: false,
      reason: "bad-secret",
    });
  });
});
