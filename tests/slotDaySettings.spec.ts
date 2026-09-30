import { describe, it, expect } from "vitest";
import {
  mergeSlotStates,
  toRemainingCovers,
  capacityFromRemainingCovers,
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
      },
    ]);
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
