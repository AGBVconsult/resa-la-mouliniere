import { describe, it, expect } from "vitest";
import {
  mergeSlotStates,
  toRemainingCovers,
  capacityFromRemainingCovers,
  clampRemainingCovers,
  coverLevel,
  isSlotModified,
  buildSlotUpdate,
  clampGroupSize,
  type SlotState,
} from "../src/lib/utils/slot-day-settings";

const server = (id: string, timeKey: string, isOpen: boolean, capacity: number) => ({
  _id: id,
  timeKey,
  isOpen,
  capacity,
});

const local = (
  id: string,
  timeKey: string,
  isOpen: boolean,
  capacity: number,
  originalIsOpen = isOpen,
  originalCapacity = capacity
): SlotState => ({
  _id: id,
  timeKey,
  isOpen,
  capacity,
  originalIsOpen,
  originalCapacity,
  maxGroupSize: null,
  originalMaxGroupSize: null,
});

describe("mergeSlotStates", () => {
  it("initialise l'état local depuis le serveur", () => {
    const merged = mergeSlotStates([server("a", "19:00", true, 50)], []);

    expect(merged).toEqual([
      {
        _id: "a",
        timeKey: "19:00",
        isOpen: true,
        capacity: 50,
        originalIsOpen: true,
        originalCapacity: 50,
        maxGroupSize: null,
        originalMaxGroupSize: null,
      },
    ]);
  });

  it("reprend la taille de groupe du serveur et conserve la modification locale", () => {
    const [init] = mergeSlotStates([{ ...server("a", "19:00", true, 50), maxGroupSize: 15 }], []);
    expect(init).toMatchObject({ maxGroupSize: 15, originalMaxGroupSize: 15 });

    const edited = { ...init, maxGroupSize: null };
    const [merged] = mergeSlotStates([{ ...server("a", "19:00", true, 50), maxGroupSize: 8 }], [edited]);
    expect(merged).toMatchObject({ maxGroupSize: null, originalMaxGroupSize: 8 });
  });

  it("fait apparaître un créneau ajouté sans perdre les modifications en cours", () => {
    const previous = [local("a", "19:00", false, 50, true, 50)];

    const merged = mergeSlotStates(
      [server("a", "19:00", true, 50), server("b", "19:30", true, 50)],
      previous
    );

    expect(merged).toHaveLength(2);
    // modification locale non enregistrée conservée
    expect(merged[0]).toMatchObject({ _id: "a", isOpen: false, originalIsOpen: true });
    // nouveau créneau visible immédiatement, ouvert
    expect(merged[1]).toMatchObject({ _id: "b", timeKey: "19:30", isOpen: true, originalIsOpen: true });
  });

  it("retire les créneaux disparus côté serveur", () => {
    const previous = [local("a", "19:00", true, 50), local("b", "19:30", true, 50)];

    const merged = mergeSlotStates([server("a", "19:00", true, 50)], previous);

    expect(merged.map((s) => s._id)).toEqual(["a"]);
  });

  it("réaligne la référence originale sur le serveur", () => {
    const previous = [local("a", "19:00", true, 50)];

    const merged = mergeSlotStates([server("a", "19:00", false, 20)], previous);

    expect(merged[0]).toMatchObject({
      isOpen: true,
      capacity: 50,
      originalIsOpen: false,
      originalCapacity: 20,
    });
  });
});

describe("modifications d'un créneau", () => {
  it("détecte un changement de taille de groupe", () => {
    const slot = local("a", "19:00", true, 50);
    expect(isSlotModified(slot)).toBe(false);
    expect(isSlotModified({ ...slot, maxGroupSize: 6 })).toBe(true);
  });

  it("n'envoie que les champs modifiés", () => {
    const slot = { ...local("a", "19:00", true, 50), maxGroupSize: 6, originalMaxGroupSize: null };
    expect(buildSlotUpdate(slot)).toEqual({ slotId: "a", maxGroupSize: 6 });
    expect(buildSlotUpdate({ ...slot, maxGroupSize: null, capacity: 40 })).toEqual({ slotId: "a", capacity: 40 });
  });

  it("borne la taille de groupe entre 1 et 50", () => {
    expect(clampGroupSize(0)).toBe(1);
    expect(clampGroupSize(51)).toBe(50);
    expect(clampGroupSize(6)).toBe(6);
  });
});

describe("couverts restants", () => {
  it("affiche la capacité moins les couverts réservés", () => {
    expect(toRemainingCovers(16, 4)).toBe(12);
    expect(toRemainingCovers(16, 0)).toBe(16);
  });

  it("ne descend jamais sous zéro en cas de surréservation", () => {
    expect(toRemainingCovers(8, 10)).toBe(0);
  });

  it("reconvertit la saisie en capacité totale", () => {
    expect(capacityFromRemainingCovers(12, 4)).toBe(16);
    expect(capacityFromRemainingCovers(20, 4)).toBe(24);
    expect(capacityFromRemainingCovers(0, 4)).toBe(4);
    expect(capacityFromRemainingCovers(-3, 4)).toBe(4);
  });
});

describe("clampRemainingCovers", () => {
  it("borne entre 0 et le maximum", () => {
    expect(clampRemainingCovers(-1)).toBe(0);
    expect(clampRemainingCovers(12)).toBe(12);
    expect(clampRemainingCovers(250)).toBe(100);
    expect(clampRemainingCovers(NaN)).toBe(0);
  });
});

describe("coverLevel", () => {
  it("full à 0 restant", () => {
    expect(coverLevel(0, 16)).toBe("full");
    expect(coverLevel(0, 0)).toBe("full");
  });

  it("low quand ≤ 25 % restant sur un créneau entamé", () => {
    expect(coverLevel(4, 12)).toBe("low");
    expect(coverLevel(2, 14)).toBe("low");
  });

  it("ok sinon", () => {
    expect(coverLevel(12, 4)).toBe("ok");
    expect(coverLevel(2, 0)).toBe("ok");
  });
});
