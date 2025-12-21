import { afterEach, describe, expect, it, vi } from "vitest";
import { pickAIMove } from "./ai";
import { initialState, type Cell, type LocalResult } from "./engine";

function fullBoard(value: Cell): Cell[] {
  return Array<Cell>(9).fill(value);
}

describe("pickAIMove", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("returns null when there are no legal moves", () => {
    const state = initialState();
    const local: LocalResult[] = Array(9).fill("D");
    const move = pickAIMove(state.boards, local, null, "X");
    expect(move).toBeNull();
  });

  it("returns the only available move", () => {
    const boards = Array.from({ length: 9 }, () => fullBoard("X"));
    const local: LocalResult[] = Array(9).fill("X");
    const targetBoard = 4;
    const targetCell = 7;
    boards[targetBoard][targetCell] = null;
    local[targetBoard] = null;

    const move = pickAIMove(boards, local, targetBoard, "O");
    expect(move).toMatchObject({ bi: targetBoard, ci: targetCell });
  });

  it("respects forced board selection", () => {
    vi.spyOn(Math, "random").mockReturnValue(0);
    const state = initialState();
    const forced = 2;
    const move = pickAIMove(state.boards, state.local, forced, "X");
    expect(move?.bi).toBe(forced);
  });
});
