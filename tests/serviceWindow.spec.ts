import { describe, it, expect } from "vitest";
import { isCreatedDuringService } from "../src/lib/utils/service-window";

// 2026-09-30 : Bruxelles = UTC+2 (heure d'été)
const at = (iso: string) => new Date(iso).getTime();

describe("isCreatedDuringService", () => {
  const lunchSlots = ["12:00", "12:30", "13:00", "13:30"];

  it("détecte une réservation créée pendant le service du midi", () => {
    expect(
      isCreatedDuringService(
        { createdAt: at("2026-09-30T10:45:00Z"), dateKey: "2026-09-30", service: "lunch" },
        lunchSlots
      )
    ).toBe(true);
  });

  it("ignore une réservation créée avant le début du service", () => {
    expect(
      isCreatedDuringService(
        { createdAt: at("2026-09-30T08:00:00Z"), dateKey: "2026-09-30", service: "lunch" },
        lunchSlots
      )
    ).toBe(false);
  });

  it("ignore une réservation créée un autre jour", () => {
    expect(
      isCreatedDuringService(
        { createdAt: at("2026-09-29T10:45:00Z"), dateKey: "2026-09-30", service: "lunch" },
        lunchSlots
      )
    ).toBe(false);
  });

  it("ignore une réservation créée bien après la fin du service", () => {
    expect(
      isCreatedDuringService(
        { createdAt: at("2026-09-30T15:00:00Z"), dateKey: "2026-09-30", service: "lunch" },
        lunchSlots
      )
    ).toBe(false);
  });

  it("utilise les horaires par défaut sans créneaux", () => {
    expect(
      isCreatedDuringService(
        { createdAt: at("2026-09-30T17:30:00Z"), dateKey: "2026-09-30", service: "dinner" }
      )
    ).toBe(true);
    expect(
      isCreatedDuringService({ dateKey: "2026-09-30", service: "dinner" })
    ).toBe(false);
  });
});

describe("isCreatedDuringService — prise de connaissance", () => {
  it("n'est plus signalée après une action du staff", () => {
    expect(
      isCreatedDuringService(
        {
          createdAt: at("2026-09-30T10:45:00Z"),
          acknowledgedAt: at("2026-09-30T10:50:00Z"),
          dateKey: "2026-09-30",
          service: "lunch",
        },
        ["12:00", "13:30"]
      )
    ).toBe(false);
  });
});
