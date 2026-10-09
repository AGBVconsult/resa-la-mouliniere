import { describe, expect, test } from "vitest";

import {
  buildAdminPushPayload,
  isAllowedPushEndpoint,
  isExpiredSubscriptionStatus,
} from "../convex/lib/webPush";

describe("isAllowedPushEndpoint", () => {
  test("accepts Apple, Google, Mozilla and Microsoft push services", () => {
    expect(isAllowedPushEndpoint("https://web.push.apple.com/QGx1abc")).toBe(true);
    expect(isAllowedPushEndpoint("https://fcm.googleapis.com/fcm/send/abc")).toBe(true);
    expect(isAllowedPushEndpoint("https://updates.push.services.mozilla.com/wpush/v2/abc")).toBe(true);
    expect(isAllowedPushEndpoint("https://wns2-par02p.notify.windows.com/w/?token=abc")).toBe(true);
  });

  test("rejects unknown hosts, look-alikes and plain http", () => {
    expect(isAllowedPushEndpoint("https://evil.example.com/push")).toBe(false);
    expect(isAllowedPushEndpoint("https://web.push.apple.com.evil.com/x")).toBe(false);
    expect(isAllowedPushEndpoint("https://evilweb.push.apple.com/x")).toBe(false);
    expect(isAllowedPushEndpoint("http://web.push.apple.com/x")).toBe(false);
    expect(isAllowedPushEndpoint("not a url")).toBe(false);
  });
});

describe("isExpiredSubscriptionStatus", () => {
  test("404 and 410 mean the subscription is gone", () => {
    expect(isExpiredSubscriptionStatus(404)).toBe(true);
    expect(isExpiredSubscriptionStatus(410)).toBe(true);
  });

  test("other errors are not treated as expired", () => {
    expect(isExpiredSubscriptionStatus(429)).toBe(false);
    expect(isExpiredSubscriptionStatus(500)).toBe(false);
    expect(isExpiredSubscriptionStatus(undefined)).toBe(false);
  });
});

describe("buildAdminPushPayload", () => {
  const reservation = {
    reservationId: "res123",
    name: "Jean Dupont",
    partySize: 4,
    dateKey: "2026-10-12",
    service: "dinner" as const,
    timeKey: "19:30",
    note: "Allergie noix",
  };

  test("pending reservation includes the note and links to the mobile day view", () => {
    expect(buildAdminPushPayload("pending_reservation", reservation)).toEqual({
      title: "Réservation en attente",
      body: "Jean Dupont — 4 pers.\n12/10 à 19:30\nAllergie noix",
      url: "/admin-mobile/reservations?date=2026-10-12&service=dinner",
      tag: "pending_reservation:res123",
    });
  });

  test("pending reservation without note has no trailing line", () => {
    const payload = buildAdminPushPayload("pending_reservation", { ...reservation, note: null });
    expect(payload.body).toBe("Jean Dupont — 4 pers.\n12/10 à 19:30");
  });

  test("cancellation and modification titles", () => {
    expect(buildAdminPushPayload("cancellation", reservation).title).toBe("Annulation");
    expect(buildAdminPushPayload("modification", reservation).title).toBe("Modification");
  });
});
