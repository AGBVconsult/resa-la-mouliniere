import { describe, expect, test } from "vitest";

import {
  addDaysToDateKey,
  buildAdminPushPayload,
  buildGbpReminderPayload,
  selectGbpReminders,
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
    ).toBe("Vend 9 Oct | 12:15 | 2pers. | B. Vantilcke");
  });

  test("every weekday abbreviation", () => {
    const days = ["2026-10-05", "2026-10-06", "2026-10-07", "2026-10-08", "2026-10-09", "2026-10-10", "2026-10-11"];
    const line = (dateKey: string) =>
      formatReservationLine({ firstName: "a", lastName: "B", partySize: 1, dateKey, timeKey: "19:00" });
    expect(days.map((d) => line(d).split(" ")[0])).toEqual(["Lun", "Mar", "Merc", "Jeu", "Vend", "Sam", "Dim"]);
    expect(line("2026-10-05")).toBe("Lun 5 Oct | 19:00 | 1pers. | A. B");
  });

  test("every month abbreviation", () => {
    const months = Array.from({ length: 12 }, (_, i) =>
      formatReservationLine({
        firstName: "a",
        lastName: "B",
        partySize: 1,
        dateKey: `2026-${String(i + 1).padStart(2, "0")}-15`,
        timeKey: "19:00",
      }).split(" | ")[0].split(" ")[2]
    );
    expect(months).toEqual(["Janv", "Févr", "Mars", "Avr", "Mai", "Juin", "Juil", "Août", "Sept", "Oct", "Nov", "Déc"]);
  });

  test("today shows Auj. instead of the date", () => {
    const reservation = { firstName: "Benjamin", lastName: "Vantilcke", partySize: 2, dateKey: "2026-10-10", timeKey: "19:00" };
    expect(formatReservationLine(reservation, "2026-10-10")).toBe("Auj. | 19:00 | 2pers. | B. Vantilcke");
    expect(formatReservationLine(reservation, "2026-10-09")).toBe("Sam 10 Oct | 19:00 | 2pers. | B. Vantilcke");
  });

  test("missing first name keeps only the last name", () => {
    expect(
      formatReservationLine({ firstName: " ", lastName: "Dupont", partySize: 6, dateKey: "2026-12-31", timeKey: "20:00" })
    ).toBe("Jeu 31 Déc | 20:00 | 6pers. | Dupont");
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
      title: "Réservation en attente ⌛",
      body: "Lun 12 Oct | 19:30 | 4pers. | J. Dupont | 💬",
      url: "/admin-mobile/reservations?date=2026-10-12&service=dinner",
    });
  });

  test("no note (or blank note), no icon", () => {
    expect(buildAdminPushPayload("new_reservation", { ...reservation, note: "  " }).body).toBe(
      "Lun 12 Oct | 19:30 | 4pers. | J. Dupont"
    );
    const payload = buildAdminPushPayload("new_reservation", { ...reservation, note: null, status: "confirmed" });
    expect(payload.title).toBe("Nouvelle réservation ✅");
    expect(payload.body).toBe("Lun 12 Oct | 19:30 | 4pers. | J. Dupont");
  });

  test("modification title flags when validation is needed", () => {
    expect(buildAdminPushPayload("modification", reservation).title).toBe("Modification à valider ⌛");
    expect(
      buildAdminPushPayload("modification", { ...reservation, status: "confirmed" }).title
    ).toBe("Modification 🔀");
  });

  test("cancellation never shows the note text", () => {
    const payload = buildAdminPushPayload("cancellation", reservation);
    expect(payload.title).toBe("Annulation 🚫");
    expect(payload.body).toBe("Lun 12 Oct | 19:30 | 4pers. | J. Dupont | 💬");
  });
});

describe("Google Business Profile reminders", () => {
  const vacances = { name: "Vacances", status: "closed" as const, startDate: "2026-10-20", endDate: "2026-11-02" };
  const event = { name: "Soirée jazz", status: "modified" as const, startDate: "2026-10-30", endDate: "2026-10-30" };

  test("addDaysToDateKey crosses months and years", () => {
    expect(addDaysToDateKey("2026-10-30", 3)).toBe("2026-11-02");
    expect(addDaysToDateKey("2026-12-30", 3)).toBe("2027-01-02");
    expect(addDaysToDateKey("2026-03-27", 3)).toBe("2026-03-30"); // DST change
  });

  test("reminds 3 days before start and 3 days before end", () => {
    expect(selectGbpReminders([vacances, event], "2026-10-17")).toEqual([{ kind: "start", period: vacances }]);
    expect(selectGbpReminders([vacances, event], "2026-10-30")).toEqual([{ kind: "end", period: vacances }]);
    expect(selectGbpReminders([vacances, event], "2026-10-18")).toEqual([]);
  });

  test("single-day period: one reminder showing a single date", () => {
    const reminders = selectGbpReminders([event], "2026-10-27");
    expect(reminders.map((r) => r.kind)).toEqual(["start"]);
    expect(buildGbpReminderPayload(reminders[0]).body).toBe("Début dans 3j | Soirée jazz | Horaires modifiés | Vend 30 Oct");
  });

  test("payload texts", () => {
    expect(buildGbpReminderPayload({ kind: "start", period: vacances })).toEqual({
      title: "Fiche Google à mettre à jour 📍",
      body: "Début dans 3j | Vacances | Fermé | Mar 20 Oct → Lun 2 Nov",
      url: "/admin-mobile/fiche-google",
    });
    expect(buildGbpReminderPayload({ kind: "end", period: vacances }).body).toBe(
      "Fin dans 3j | Vacances | Horaires habituels dès Mar 3 Nov"
    );
  });
});
