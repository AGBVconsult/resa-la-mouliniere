import { describe, test, expect } from "vitest";
import {
  buildTemplateUpdates,
  countChanges,
  deriveServiceSchedule,
  deriveWeekSchedule,
  newTemplateSlot,
  suggestNewSlotTime,
  type TemplateSlot,
  type WeekSchedule,
  type WeeklyTemplate,
} from "../src/app/admin-tablette/creneaux/scheduleUtils";

const slot = (timeKey: string, capacity = 8, patch: Partial<TemplateSlot> = {}): TemplateSlot => ({
  timeKey,
  capacity,
  isActive: true,
  largeTableAllowed: false,
  maxGroupSize: null,
  ...patch,
});

const lunch = (dayOfWeek: number, isOpen: boolean, slots: TemplateSlot[]): WeeklyTemplate => ({
  dayOfWeek,
  service: "lunch",
  isOpen,
  slots,
});

const dinner = (dayOfWeek: number, isOpen: boolean, slots: TemplateSlot[]): WeeklyTemplate => ({
  dayOfWeek,
  service: "dinner",
  isOpen,
  slots,
});

// Midi : ouvert du mercredi au dimanche ; soir : ouvert vendredi et samedi.
const LUNCH_SLOTS = [slot("12:00"), slot("12:30"), slot("13:00")];
const DINNER_SLOTS = [slot("19:00", 10), slot("19:30", 10)];
const templates: WeeklyTemplate[] = [
  ...[1, 2, 3, 4, 5, 6, 7].map((d) => lunch(d, d >= 3, LUNCH_SLOTS)),
  ...[1, 2, 3, 4, 5, 6, 7].map((d) => dinner(d, d === 5 || d === 6, DINNER_SLOTS)),
];

const edit = (base: WeekSchedule, fn: (draft: WeekSchedule) => void): WeekSchedule => {
  const draft = structuredClone(base);
  fn(draft);
  return draft;
};

describe("deriveServiceSchedule", () => {
  test("jours ouverts et créneaux du service, triés", () => {
    expect(deriveServiceSchedule(templates, "lunch")).toEqual({ openDays: [3, 4, 5, 6, 7], slots: LUNCH_SLOTS });
    expect(deriveServiceSchedule(templates, "dinner").openDays).toEqual([5, 6]);
  });

  test("union des créneaux des jours ouverts, sans ceux des jours fermés", () => {
    const mixed = [lunch(1, false, [slot("11:30")]), lunch(2, true, [slot("13:00")]), lunch(3, true, [slot("12:00"), slot("13:00", 4)])];
    const schedule = deriveServiceSchedule(mixed, "lunch");
    expect(schedule.slots.map((s) => s.timeKey)).toEqual(["12:00", "13:00"]);
    // Valeurs du premier jour ouvert qui porte le créneau
    expect(schedule.slots[1].capacity).toBe(8);
  });

  test("aucun jour ouvert : on montre quand même l'horaire", () => {
    const schedule = deriveServiceSchedule([lunch(1, false, [slot("12:00")])], "lunch");
    expect(schedule).toEqual({ openDays: [], slots: [slot("12:00")] });
  });
});

describe("countChanges", () => {
  const base = deriveWeekSchedule(templates);

  test("aucune modification", () => {
    expect(countChanges(base, structuredClone(base))).toBe(0);
  });

  test("compte jours, créneaux ajoutés, supprimés et modifiés", () => {
    const current = edit(base, (d) => {
      d.lunch.openDays = [3, 4, 5, 6]; // dimanche fermé
      d.lunch.slots[0].capacity = 12; // 12:00 modifié
      d.dinner.slots = [d.dinner.slots[0], newTemplateSlot("20:00")]; // 19:30 supprimé, 20:00 ajouté
    });
    expect(countChanges(base, current)).toBe(4);
  });

  test("supprimer puis rajouter un créneau identique n'est pas une modification", () => {
    const removed = edit(base, (d) => {
      d.lunch.slots = d.lunch.slots.filter((s) => s.timeKey !== "12:30");
    });
    const readded = edit(removed, (d) => {
      d.lunch.slots = [...d.lunch.slots, slot("12:30")].sort((a, b) => a.timeKey.localeCompare(b.timeKey));
    });
    expect(countChanges(base, removed)).toBe(1);
    expect(countChanges(base, readded)).toBe(0);
  });
});

describe("buildTemplateUpdates", () => {
  const base = deriveWeekSchedule(templates);

  test("aucune modification : aucun modèle à réécrire", () => {
    expect(buildTemplateUpdates(templates, base, structuredClone(base))).toEqual([]);
  });

  test("une capacité modifiée est reportée sur tous les jours du service", () => {
    const current = edit(base, (d) => {
      d.lunch.slots[1].capacity = 14;
    });
    const updates = buildTemplateUpdates(templates, base, current);
    expect(updates.map((u) => u.dayOfWeek)).toEqual([1, 2, 3, 4, 5, 6, 7]);
    for (const update of updates) {
      expect(update.service).toBe("lunch");
      expect(update.slots.find((s) => s.timeKey === "12:30")?.capacity).toBe(14);
      expect(update.slots.find((s) => s.timeKey === "12:00")?.capacity).toBe(8);
    }
    // Les jours fermés restent fermés
    expect(updates.find((u) => u.dayOfWeek === 1)?.isOpen).toBe(false);
    expect(updates.find((u) => u.dayOfWeek === 3)?.isOpen).toBe(true);
  });

  test("seul le champ modifié est reporté : les valeurs propres à un jour sont conservées", () => {
    const perDay = templates.map((t) =>
      t.service === "lunch" && t.dayOfWeek === 6 ? { ...t, slots: [slot("12:00", 20), slot("12:30"), slot("13:00")] } : t
    );
    const current = edit(base, (d) => {
      d.lunch.slots[0].maxGroupSize = 6;
    });
    const saturday = buildTemplateUpdates(perDay, base, current).find((u) => u.dayOfWeek === 6);
    expect(saturday?.slots[0]).toEqual(slot("12:00", 20, { maxGroupSize: 6 }));
  });

  test("fermer un jour ne touche qu'à ce jour", () => {
    const current = edit(base, (d) => {
      d.dinner.openDays = [5];
    });
    expect(buildTemplateUpdates(templates, base, current)).toEqual([dinner(6, false, DINNER_SLOTS)]);
  });

  test("ouvrir un jour lui donne l'horaire affiché", () => {
    const stale = templates.map((t) => (t.service === "dinner" && t.dayOfWeek === 4 ? { ...t, slots: [slot("18:00", 2)] } : t));
    const current = edit(base, (d) => {
      d.dinner.openDays = [4, 5, 6];
      d.dinner.slots[0].capacity = 12;
    });
    const updates = buildTemplateUpdates(stale, base, current);
    expect(updates.find((u) => u.dayOfWeek === 4)).toEqual(dinner(4, true, [slot("19:00", 12), slot("19:30", 10)]));
  });

  test("ouvrir un jour sans modèle le crée ; un jour fermé sans modèle est ignoré", () => {
    const withoutSunday = templates.filter((t) => !(t.service === "dinner" && t.dayOfWeek === 7));
    const current = edit(base, (d) => {
      d.dinner.slots = [...d.dinner.slots, newTemplateSlot("20:00")];
    });
    expect(buildTemplateUpdates(withoutSunday, base, current).some((u) => u.dayOfWeek === 7)).toBe(false);

    const opened = edit(current, (d) => {
      d.dinner.openDays = [5, 6, 7];
    });
    const sunday = buildTemplateUpdates(withoutSunday, base, opened).find((u) => u.dayOfWeek === 7);
    expect(sunday).toEqual(dinner(7, true, [...DINNER_SLOTS, newTemplateSlot("20:00")]));
  });

  test("ajout et suppression de créneaux sur tous les jours, horaire trié", () => {
    const current = edit(base, (d) => {
      d.lunch.slots = [newTemplateSlot("11:45"), ...d.lunch.slots.filter((s) => s.timeKey !== "13:00")];
    });
    const updates = buildTemplateUpdates(templates, base, current);
    expect(updates).toHaveLength(7);
    for (const update of updates) {
      expect(update.slots.map((s) => s.timeKey)).toEqual(["11:45", "12:00", "12:30"]);
    }
  });

  test("un créneau ajouté déjà présent (masqué) sur un jour fermé prend les nouvelles valeurs", () => {
    const hidden = templates.map((t) =>
      t.service === "lunch" && t.dayOfWeek === 1 ? { ...t, slots: [...LUNCH_SLOTS, slot("13:30", 3, { isActive: false })] } : t
    );
    const current = edit(base, (d) => {
      d.lunch.slots = [...d.lunch.slots, newTemplateSlot("13:30")];
    });
    const monday = buildTemplateUpdates(hidden, base, current).find((u) => u.dayOfWeek === 1);
    expect(monday?.slots.filter((s) => s.timeKey === "13:30")).toEqual([newTemplateSlot("13:30")]);
  });

  test("les créneaux envoyés n'ont que les champs attendus par le serveur", () => {
    const current = edit(base, (d) => {
      d.lunch.slots[0].isActive = false;
    });
    for (const update of buildTemplateUpdates(templates, base, current)) {
      expect(Object.keys(update).sort()).toEqual(["dayOfWeek", "isOpen", "service", "slots"]);
      for (const s of update.slots) {
        expect(Object.keys(s).sort()).toEqual(["capacity", "isActive", "largeTableAllowed", "maxGroupSize", "timeKey"]);
      }
    }
  });
});

describe("suggestNewSlotTime", () => {
  test("30 minutes après le dernier créneau", () => {
    expect(suggestNewSlotTime([slot("12:00"), slot("13:15")], "lunch")).toBe("13:45");
  });

  test("heure par défaut sans créneau", () => {
    expect(suggestNewSlotTime([], "lunch")).toBe("12:00");
    expect(suggestNewSlotTime([], "dinner")).toBe("19:00");
  });

  test("ne dépasse pas 23:45", () => {
    expect(suggestNewSlotTime([slot("23:30")], "dinner")).toBe("23:45");
  });
});
