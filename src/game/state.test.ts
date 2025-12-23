import { describe, expect, it } from "vitest";
import { applyMove } from "./state";
import { acceptDouble, declineDouble, offerDouble } from "./state";
import { initialState, type Move } from "./engine";

describe("applyMove", () => {
  it("places a mark and toggles the turn", () => {
    const state = initialState();
    const move: Move = { bi: 0, ci: 0 };
    const next = applyMove(state, move);
    expect(next.boards[0][0]).toBe("X");
    expect(next.turn).toBe("O");
  });

  it("forces the next board based on cell index", () => {
    const state = initialState();
    const next = applyMove(state, { bi: 0, ci: 5 });
    expect(next.nextBoard).toBe(5);
  });

  it("frees next board if target board is decided", () => {
    const state = initialState();
    state.local[5] = "X";
    const next = applyMove(state, { bi: 0, ci: 5 });
    expect(next.nextBoard).toBeNull();
  });

  it("computes local win and records win line", () => {
    const state = initialState();
    state.boards[0][0] = "X";
    state.boards[0][1] = "X";
    const next = applyMove(state, { bi: 0, ci: 2 });
    expect(next.local[0]).toBe("X");
  });

  it("offers a double for the current player", () => {
    const state = initialState();
    const next = offerDouble(state);
    expect(next.pendingDouble).toBe("X");
  });

  it("accepts a double and assigns cube ownership", () => {
    const state = initialState();
    state.pendingDouble = "X";
    const next = acceptDouble(state);
    expect(next.pendingDouble).toBeNull();
    expect(next.cubeValue).toBe(2);
    expect(next.cubeOwner).toBe("O");
  });

  it("declines a double and awards the game", () => {
    const state = initialState();
    state.pendingDouble = "O";
    const next = declineDouble(state);
    expect(next.pendingDouble).toBeNull();
    expect(next.result).toBe("O");
  });

  it("acceptDouble returns unchanged state if no pending double", () => {
    const state = initialState();
    const next = acceptDouble(state);
    expect(next).toBe(state);
  });

  it("declineDouble returns unchanged state if no pending double", () => {
    const state = initialState();
    const next = declineDouble(state);
    expect(next).toBe(state);
  });

  it("offerDouble does nothing if double not allowed", () => {
    const state = initialState();
    state.result = "X"; // Game over - can't double
    const next = offerDouble(state);
    expect(next).toBe(state);
  });

  it("cube value doubles on accept", () => {
    const state = initialState();
    state.cubeValue = 4;
    state.pendingDouble = "X";
    const next = acceptDouble(state);
    expect(next.cubeValue).toBe(8);
    expect(next.cubeOwner).toBe("O");
  });
});
