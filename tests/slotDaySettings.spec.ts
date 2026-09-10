import { describe, it, expect } from "vitest";
import { mergeSlotStates, type SlotState } from "../src/lib/utils/slot-day-settings";

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
