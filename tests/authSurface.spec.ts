/**
 * Surface publique de Convex.
 *
 * Toute fonction exportée avec `query(`, `mutation(` ou `action(` est appelable
 * par quiconque connaît l'URL du déploiement. Elle doit donc :
 * - soit figurer dans PUBLIC_FUNCTIONS (widget, gestion par token, analytics) ;
 * - soit appeler `requireRole(` en première instruction de son handler.
 *
 * Tout ce qui n'est pas appelé par le navigateur doit être `internal*`.
 */
import { describe, expect, it } from "vitest";
import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";

const CONVEX_DIR = join(__dirname, "..", "convex");

/** Fonctions volontairement accessibles sans identité. */
export const PUBLIC_FUNCTIONS = new Set([
  "widget.getSettings",
  "availability.getDay",
  "availability.getMonth",
  "reservations.create",
  "reservations.getByToken",
  "reservations.updateByToken",
  "reservations.cancelByToken",
  "groupRequests.create",
  "bookingDrafts.save",
  "bookingDrafts.deleteDraft",
  "funnelEvents.record",
  "specialPeriods.getActiveClosure",
]);

type PublicFn = { name: string; kind: string; body: string };

function listPublicFunctions(): PublicFn[] {
  const out: PublicFn[] = [];
  for (const file of readdirSync(CONVEX_DIR).filter((f) => f.endsWith(".ts"))) {
    const src = readFileSync(join(CONVEX_DIR, file), "utf8");
    const re = /export const (\w+) = (query|mutation|action)\(/g;
    let m: RegExpExecArray | null;
    while ((m = re.exec(src))) {
      const end = src.indexOf("\n});", m.index);
      out.push({
        name: `${file.replace(/\.ts$/, "")}.${m[1]}`,
        kind: m[2],
        body: src.slice(m.index, end < 0 ? src.length : end),
      });
    }
  }
  return out;
}

describe("surface publique Convex", () => {
  const fns = listPublicFunctions();

  it("détecte au moins une fonction publique", () => {
    expect(fns.length).toBeGreaterThan(20);
  });

  it.each(fns.map((f) => [f.name, f] as const))(
    "%s : garde requireRole ou allowlist explicite",
    (name, fn) => {
      const guarded = /await requireRole\(ctx,/.test(fn.body);
      const allowed = PUBLIC_FUNCTIONS.has(name);
      expect(guarded || allowed, `${name} (${fn.kind}) est publique sans requireRole ni allowlist`).toBe(true);
      // Une fonction gardée ne doit pas aussi être déclarée publique : l'allowlist doit rester minimale.
      expect(guarded && allowed, `${name} figure dans PUBLIC_FUNCTIONS mais appelle requireRole`).toBe(false);
    }
  );

  it("chaque entrée de PUBLIC_FUNCTIONS existe et est publique", () => {
    const names = new Set(fns.map((f) => f.name));
    for (const name of PUBLIC_FUNCTIONS) {
      expect(names.has(name), `${name} n'existe pas ou n'est plus publique`).toBe(true);
    }
  });

  it("les fonctions d'outillage destructrices ne sont pas publiques", () => {
    const names = new Set(fns.map((f) => f.name));
    for (const forbidden of [
      "slots.seedRange",
      "slots.closeRange",
      "slots.openRange",
      "weeklyTemplates.seedDefaults",
      "admin.updateSecrets",
      "tables.assignToReservation",
    ]) {
      expect(names.has(forbidden), `${forbidden} ne doit pas être publique`).toBe(false);
    }
  });
});
