import { describe, expect, it } from "vitest";
import { applyMove } from "./state";
import { initialState } from "./engine";

describe("applyMove", () => {
  it("places a mark and toggles the turn", () => {
    const state = initialState();
    const next = applyMove(state, 0, 0);
    expect(next.boards[0][0]).toBe("X");
    expect(next.turn).toBe("O");
  });

  it("forces the next board based on cell index", () => {
    const state = initialState();
    const next = applyMove(state, 0, 5);
    expect(next.nextBoard).toBe(5);
  });

  it("frees next board if target board is decided", () => {
    const state = initialState();
    state.local[5] = "X";
    const next = applyMove(state, 0, 5);
    expect(next.nextBoard).toBeNull();
  });

  it("computes local win and records win line", () => {
    const state = initialState();
    state.boards[0][0] = "X";
    state.boards[0][1] = "X";
    const next = applyMove(state, 0, 2);
    expect(next.local[0]).toBe("X");
    expect(next.winLines[0]).toBe(0);
  });
});
