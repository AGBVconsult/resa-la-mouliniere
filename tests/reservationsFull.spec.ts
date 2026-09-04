// @vitest-environment edge-runtime
/**
 * Modification complète d'une réservation depuis l'admin (tablette) et
 * cohérence de la capacité — exécuté contre le vrai backend (convex-test).
 *
 * Couvre l'audit BUG-001 (slotKey malformé), BUG-004 (capacité divergente),
 * SEC-005 (compteurs non validés) et la migration de réparation.
 */
import { describe, expect, test, beforeEach } from "vitest";
import { convexTest } from "convex-test";
import schema from "../convex/schema";
import { api, internal } from "../convex/_generated/api";
import type { Id } from "../convex/_generated/dataModel";

const modules = import.meta.glob(["../convex/**/*.*s", "!../convex/**/*.d.ts", "!../convex/auth.config.ts"]);

const OWNER = { subject: "owner@example.test", issuer: "https://issuer.test", role: "owner" };
const DATE = "2026-10-10";

type T = ReturnType<typeof convexTest>;

async function seed(t: T): Promise<Id<"restaurants">> {
  return await t.run(async (ctx) => {
    const restaurantId = await ctx.db.insert("restaurants", { name: "Test", timezone: "Europe/Brussels", isActive: true });
    await ctx.db.insert("settings", {
      restaurantId,
      publicWidgetEnabled: true,
      turnstileSiteKey: "1x00000000000000000000AA",
      turnstileSecretKey: "placeholder",
      resendFromEmail: "no-reply@example.test",
      resendFromName: "Test",
      maxPartySizeWidget: 15,
      manageTokenExpireBeforeSlotMs: 0,
      rateLimit: { windowMs: 60000, maxRequests: 10 },
      appUrl: "https://app.test",
    });
    const now = Date.now();
    for (const [service, timeKey] of [
      ["lunch", "12:00"],
      ["dinner", "19:00"],
    ] as const) {
      await ctx.db.insert("slots", {
        restaurantId,
        dateKey: DATE,
        service,
        timeKey,
        slotKey: `${DATE}#${service}#${timeKey}`,
        isOpen: true,
        capacity: 10,
        maxGroupSize: null,
        largeTableAllowed: true,
        updatedAt: now,
      });
    }
    return restaurantId;
  });
}

function baseCreate() {
  return {
    dateKey: DATE,
    service: "lunch" as const,
    timeKey: "12:00",
    adults: 2,
    childrenCount: 0,
    babyCount: 0,
    firstName: "jean",
    lastName: "dupont",
    email: "jean@example.test",
    phone: "0470123456",
    language: "fr" as const,
    source: "phone" as const,
  };
}

describe("admin.updateReservationFull", () => {
  let t: T;
  let asOwner: ReturnType<T["withIdentity"]>;

  beforeEach(async () => {
    delete process.env.CONVEX_AUTH_ENFORCEMENT;
    t = convexTest(schema, modules);
    await seed(t);
    asOwner = t.withIdentity(OWNER);
  });

  test("déplacer une réservation écrit un slotKey canonique, met à jour le service et compte les bébés", async () => {
    const { reservationId } = await asOwner.mutation(api.admin.createReservation, baseCreate());
    const before = await t.run((ctx) => ctx.db.get(reservationId));
    expect(before?.slotKey).toBe(`${DATE}#lunch#12:00`);

    const res = await asOwner.mutation(api.admin.updateReservationFull, {
      reservationId,
      expectedVersion: before!.version,
      service: "dinner",
      timeKey: "19:00",
      babyCount: 1,
    });
    expect(res.slotKey).toBe(`${DATE}#dinner#19:00`);

    const after = await t.run((ctx) => ctx.db.get(reservationId));
    expect(after?.slotKey).toBe(`${DATE}#dinner#19:00`);
    expect(after?.service).toBe("dinner");
    expect(after?.partySize).toBe(3);
    expect(after?.version).toBe(before!.version + 1);

    // La disponibilité publique reflète le déplacement (audit BUG-001 : surbooking invisible)
    const day = await t.query(api.availability.getDay, { dateKey: DATE, partySize: 1 });
    const dinner = day.dinner.find((s) => s.timeKey === "19:00");
    const lunch = day.lunch.find((s) => s.timeKey === "12:00");
    expect(dinner?.remainingCapacity).toBe(7);
    expect(lunch?.remainingCapacity).toBe(10);
  });

  test("changer l'heure sans préciser le service (fiche client) déduit le service du créneau", async () => {
    const { reservationId } = await asOwner.mutation(api.admin.createReservation, baseCreate());
    const before = await t.run((ctx) => ctx.db.get(reservationId));

    await asOwner.mutation(api.admin.updateReservationFull, {
      reservationId,
      expectedVersion: before!.version,
      timeKey: "19:00",
    });

    const after = await t.run((ctx) => ctx.db.get(reservationId));
    expect(after?.service).toBe("dinner");
    expect(after?.slotKey).toBe(`${DATE}#dinner#19:00`);
  });

  test("créneau inexistant → SLOT_NOT_FOUND ; capacité dépassée → INSUFFICIENT_CAPACITY ; force → accepté", async () => {
    const { reservationId } = await asOwner.mutation(api.admin.createReservation, baseCreate());
    const r1 = await t.run((ctx) => ctx.db.get(reservationId));

    await expect(
      asOwner.mutation(api.admin.updateReservationFull, { reservationId, expectedVersion: r1!.version, timeKey: "13:00" })
    ).rejects.toMatchObject({ data: { code: "NOT_FOUND" } });

    // Remplir le dîner : 9 couverts
    await asOwner.mutation(api.admin.createReservation, {
      ...baseCreate(),
      service: "dinner",
      timeKey: "19:00",
      adults: 9,
      phone: "0470000000",
      email: "x@example.test",
    });

    await expect(
      asOwner.mutation(api.admin.updateReservationFull, {
        reservationId,
        expectedVersion: r1!.version,
        service: "dinner",
        timeKey: "19:00",
      })
    ).rejects.toMatchObject({ data: { code: "INSUFFICIENT_CAPACITY" } });

    const forced = await asOwner.mutation(api.admin.updateReservationFull, {
      reservationId,
      expectedVersion: r1!.version,
      service: "dinner",
      timeKey: "19:00",
      force: true,
    });
    expect(forced.slotKey).toBe(`${DATE}#dinner#19:00`);
  });

  test("compteurs négatifs ou décimaux → VALIDATION_ERROR (admin et interne)", async () => {
    const { reservationId } = await asOwner.mutation(api.admin.createReservation, baseCreate());
    const r = await t.run((ctx) => ctx.db.get(reservationId));

    await expect(
      asOwner.mutation(api.admin.updateReservationFull, { reservationId, expectedVersion: r!.version, childrenCount: -1 })
    ).rejects.toMatchObject({ data: { code: "VALIDATION_ERROR" } });

    await expect(
      asOwner.mutation(api.admin.createReservation, { ...baseCreate(), adults: 12, childrenCount: -11 })
    ).rejects.toMatchObject({ data: { code: "VALIDATION_ERROR" } });

    await expect(
      asOwner.mutation(api.admin.createReservationQuick, {
        dateKey: DATE,
        service: "lunch",
        timeKey: "12:00",
        adults: 1.5,
        childrenCount: 0,
        babyCount: 0,
        language: "fr",
        source: "walkin",
      })
    ).rejects.toMatchObject({ data: { code: "VALIDATION_ERROR" } });
  });

  test("la création admin respecte les overrides de créneau (fermeture manuelle)", async () => {
    const restaurantId = (await t.run((ctx) => ctx.db.query("restaurants").first()))!._id;
    await t.run((ctx) =>
      ctx.db.insert("slotOverrides", {
        restaurantId,
        slotKey: `${DATE}#lunch#12:00`,
        origin: "manual",
        patch: { isOpen: false },
        createdAt: Date.now(),
        updatedAt: Date.now(),
      })
    );
    await expect(asOwner.mutation(api.admin.createReservation, baseCreate())).rejects.toMatchObject({
      data: { code: "SLOT_TAKEN" },
    });
  });

  test("changer le téléphone rattache la réservation au bon client CRM", async () => {
    const { reservationId } = await asOwner.mutation(api.admin.createReservation, baseCreate());
    const r = await t.run((ctx) => ctx.db.get(reservationId));
    const originalClient = r!.clientId;

    await asOwner.mutation(api.admin.updateReservationFull, {
      reservationId,
      expectedVersion: r!.version,
      phone: "0480999999",
    });
    const after = await t.run((ctx) => ctx.db.get(reservationId));
    expect(after?.clientId).toBeDefined();
    expect(after?.clientId).not.toBe(originalClient);
    const client = await t.run((ctx) => ctx.db.get(after!.clientId!));
    expect(client?.primaryPhone).toBe("+32480999999");
  });
});

describe("migrations.repairSlotKeys", () => {
  test("recompose les clés malformées et laisse les autres intactes", async () => {
    delete process.env.CONVEX_AUTH_ENFORCEMENT;
    const t = convexTest(schema, modules);
    const restaurantId = await seed(t);
    const now = Date.now();
    const base = {
      restaurantId,
      adults: 2,
      childrenCount: 0,
      babyCount: 0,
      partySize: 2,
      firstName: "A",
      lastName: "B",
      email: "a@b.test",
      phone: "+32470000000",
      language: "fr" as const,
      status: "confirmed" as const,
      source: "admin" as const,
      tableIds: [],
      version: 1,
      createdAt: now,
      updatedAt: now,
      cancelledAt: null,
      refusedAt: null,
      seatedAt: null,
      completedAt: null,
      noshowAt: null,
    };
    const [bad, good] = await t.run(async (ctx) => [
      await ctx.db.insert("reservations", { ...base, dateKey: DATE, service: "lunch", timeKey: "12:00", slotKey: `${DATE}:lunch:12:00` }),
      await ctx.db.insert("reservations", { ...base, dateKey: DATE, service: "dinner", timeKey: "19:00", slotKey: `${DATE}#dinner#19:00` }),
    ]);

    const dry = await t.mutation(internal.migrations.repairSlotKeys, { dryRun: true });
    expect(dry.repaired).toBe(1);
    expect((await t.run((ctx) => ctx.db.get(bad)))?.slotKey).toBe(`${DATE}:lunch:12:00`);

    const run = await t.mutation(internal.migrations.repairSlotKeys, {});
    expect(run.repaired).toBe(1);
    expect(run.isDone).toBe(true);
    expect((await t.run((ctx) => ctx.db.get(bad)))?.slotKey).toBe(`${DATE}#lunch#12:00`);
    expect((await t.run((ctx) => ctx.db.get(good)))?.slotKey).toBe(`${DATE}#dinner#19:00`);
  });
});
