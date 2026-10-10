import { describe, expect, test } from "vitest";

import {
  buildAdminPushPayload,
  formatReservationLine,
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

describe("formatReservationLine", () => {
  test("weekday, date, time, party size, initial + last name", () => {
    expect(
      formatReservationLine({
        firstName: "Benjamin",
        lastName: "Vantilcke",
        partySize: 2,
        dateKey: "2026-10-09",
        timeKey: "12:15",
      })
    ).toBe("Vend 09/10 | 12:15 | 2pers. | B. Vantilcke");
  });

  test("every weekday abbreviation", () => {
    const days = ["2026-10-05", "2026-10-06", "2026-10-07", "2026-10-08", "2026-10-09", "2026-10-10", "2026-10-11"];
    const line = (dateKey: string) =>
      formatReservationLine({ firstName: "a", lastName: "B", partySize: 1, dateKey, timeKey: "19:00" });
    expect(days.map((d) => line(d).split(" ")[0])).toEqual(["Lun", "Mar", "Merc", "Jeu", "Vend", "Sam", "Dim"]);
    expect(line("2026-10-05")).toBe("Lun 05/10 | 19:00 | 1pers. | A. B");
  });

  test("missing first name keeps only the last name", () => {
    expect(
      formatReservationLine({ firstName: " ", lastName: "Dupont", partySize: 6, dateKey: "2026-12-31", timeKey: "20:00" })
    ).toBe("Jeu 31/12 | 20:00 | 6pers. | Dupont");
  });
});

describe("buildAdminPushPayload", () => {
  const reservation = {
    firstName: "Jean",
    lastName: "Dupont",
    partySize: 4,
    dateKey: "2026-10-12",
    service: "dinner" as const,
    timeKey: "19:30",
    status: "pending",
    note: "Allergie noix",
  };

  test("pending reservation: note flagged by an icon, links to the mobile day view", () => {
    expect(buildAdminPushPayload("pending_reservation", reservation)).toEqual({
      title: "Réservation en attente 🟠",
      body: "Lun 12/10 | 19:30 | 4pers. | J. Dupont | 📝",
      url: "/admin-mobile/reservations?date=2026-10-12&service=dinner",
    });
  });

  test("no note (or blank note), no icon", () => {
    expect(buildAdminPushPayload("new_reservation", { ...reservation, note: "  " }).body).toBe(
      "Lun 12/10 | 19:30 | 4pers. | J. Dupont"
    );
    const payload = buildAdminPushPayload("new_reservation", { ...reservation, note: null, status: "confirmed" });
    expect(payload.title).toBe("Nouvelle réservation 🟢");
    expect(payload.body).toBe("Lun 12/10 | 19:30 | 4pers. | J. Dupont");
  });

  test("modification title flags when validation is needed", () => {
    expect(buildAdminPushPayload("modification", reservation).title).toBe("Modification à valider 🟠");
    expect(
      buildAdminPushPayload("modification", { ...reservation, status: "confirmed" }).title
    ).toBe("Modification 🔵");
  });

  test("cancellation never shows the note text", () => {
    const payload = buildAdminPushPayload("cancellation", reservation);
    expect(payload.title).toBe("Annulation 🔴");
    expect(payload.body).toBe("Lun 12/10 | 19:30 | 4pers. | J. Dupont | 📝");
  });
});
