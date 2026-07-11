/**
 * Regression tests for the shared table combination logic
 * (bug: auto-combination selected misaligned / non-adjacent tables at assignment time)
 */

import { describe, it, expect } from "vitest";
import {
  areTablesAdjacent,
  areTablesAdjacentEitherOrder,
  findCombinationChain,
  TABLE_GRID_SPAN,
  type CombinableTable,
} from "../src/lib/floor-plan/combination";

const table = (
  id: string,
  x: number,
  y: number,
  capacity = 2,
  width?: number,
  height?: number
): CombinableTable => ({ id, capacity, positionX: x, positionY: y, width, height });

describe("areTablesAdjacent", () => {
  it("accepts strictly adjacent horizontal tables on the same row", () => {
    expect(
      areTablesAdjacent(table("a", 0, 0), table("b", TABLE_GRID_SPAN, 0), "horizontal")
    ).toBe(true);
  });

  it("rejects tables on different rows (transverse misalignment)", () => {
    expect(
      areTablesAdjacent(table("a", 0, 0), table("b", TABLE_GRID_SPAN, 3), "horizontal")
    ).toBe(false);
  });

  it("rejects tables with a gap", () => {
    expect(
      areTablesAdjacent(table("a", 0, 0), table("b", TABLE_GRID_SPAN + 1, 0), "horizontal")
    ).toBe(false);
  });

  it("rejects overlapping tables (negative delta)", () => {
    expect(
      areTablesAdjacent(table("a", 0, 0), table("b", 1, 0), "horizontal")
    ).toBe(false);
  });

  it("takes width into account for wide tables", () => {
    // width 2 → spans 2 * TABLE_GRID_SPAN cells
    expect(
      areTablesAdjacent(table("a", 0, 0, 4, 2), table("b", 2 * TABLE_GRID_SPAN, 0), "horizontal")
    ).toBe(true);
    expect(
      areTablesAdjacent(table("a", 0, 0, 4, 2), table("b", TABLE_GRID_SPAN, 0), "horizontal")
    ).toBe(false);
  });

  it("takes height into account for vertical direction", () => {
    expect(
      areTablesAdjacent(table("a", 0, 0, 4, 1, 2), table("b", 0, 2 * TABLE_GRID_SPAN), "vertical")
    ).toBe(true);
  });

  it("requires column alignment for vertical direction", () => {
    expect(
      areTablesAdjacent(table("a", 0, 0), table("b", 3, TABLE_GRID_SPAN), "vertical")
    ).toBe(false);
  });

  it("returns false for direction none", () => {
    expect(
      areTablesAdjacent(table("a", 0, 0), table("b", TABLE_GRID_SPAN, 0), "none")
    ).toBe(false);
  });

  it("either-order works both ways", () => {
    const a = table("a", 0, 0);
    const b = table("b", TABLE_GRID_SPAN, 0);
    expect(areTablesAdjacentEitherOrder(b, a, "horizontal")).toBe(true);
  });
});

describe("findCombinationChain", () => {
  it("returns single table when capacity suffices", () => {
    const clicked = table("a", 0, 0, 4);
    expect(findCombinationChain(clicked, [], 4, "horizontal")).toEqual({
      tableIds: ["a"],
      totalCapacity: 4,
    });
  });

  it("returns null for a non-combinable table with insufficient capacity", () => {
    expect(findCombinationChain(table("a", 0, 0, 2), [], 4, "none")).toBeNull();
  });

  it("combines forward with strictly adjacent tables", () => {
    const clicked = table("a", 0, 0, 2);
    const candidates = [table("b", TABLE_GRID_SPAN, 0, 2), table("c", 2 * TABLE_GRID_SPAN, 0, 2)];
    expect(findCombinationChain(clicked, candidates, 6, "horizontal")).toEqual({
      tableIds: ["a", "b", "c"],
      totalCapacity: 6,
    });
  });

  it("combines backward when needed", () => {
    const clicked = table("c", 2 * TABLE_GRID_SPAN, 0, 2);
    const candidates = [table("b", TABLE_GRID_SPAN, 0, 2)];
    expect(findCombinationChain(clicked, candidates, 4, "horizontal")).toEqual({
      tableIds: ["b", "c"],
      totalCapacity: 4,
    });
  });

  it("ignores tables on other rows (regression: transverse misalignment)", () => {
    const clicked = table("a", 0, 0, 2);
    // Same direction/zone but on another row — must NOT be combined
    const candidates = [table("b", TABLE_GRID_SPAN, 6, 2)];
    expect(findCombinationChain(clicked, candidates, 4, "horizontal")).toBeNull();
  });

  it("stops at a gap and returns null when capacity is not reached (no partial chain)", () => {
    const clicked = table("a", 0, 0, 2);
    // Gap of 1 cell between a and b
    const candidates = [table("b", TABLE_GRID_SPAN + 1, 0, 2)];
    expect(findCombinationChain(clicked, candidates, 4, "horizontal")).toBeNull();
  });

  it("combines both sides around the clicked table", () => {
    const clicked = table("b", TABLE_GRID_SPAN, 0, 2);
    const candidates = [table("a", 0, 0, 2), table("c", 2 * TABLE_GRID_SPAN, 0, 2)];
    const result = findCombinationChain(clicked, candidates, 6, "horizontal");
    expect(result).toEqual({ tableIds: ["a", "b", "c"], totalCapacity: 6 });
  });

  it("supports vertical chains with height-aware adjacency", () => {
    const clicked = table("a", 0, 0, 2, 1, 2);
    const candidates = [table("b", 0, 2 * TABLE_GRID_SPAN, 2)];
    expect(findCombinationChain(clicked, candidates, 4, "vertical")).toEqual({
      tableIds: ["a", "b"],
      totalCapacity: 4,
    });
  });
});
