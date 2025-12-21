import { afterEach, describe, expect, it, vi } from "vitest";
import { generateCommentary, pickMove, shouldAcceptDouble, shouldDouble } from "./ai";
import { applyMove } from "./state";
import { initialState, type Cell, type LocalResult, type Player } from "./engine";

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
    const move = pickMove({ ...state, local });
    expect(move).toBeNull();
  });

  it("returns the only available move", () => {
    const boards = Array.from({ length: 9 }, () => fullBoard("X"));
    const local: LocalResult[] = Array(9).fill("X");
    const targetBoard = 4;
    const targetCell = 7;
    boards[targetBoard][targetCell] = null;
    local[targetBoard] = null;

    const move = pickMove({
      ...initialState(),
      boards,
      local,
      nextBoard: targetBoard,
      turn: "O" as Player,
    });
    expect(move).toMatchObject({ bi: targetBoard, ci: targetCell });
  });

  it("respects forced board selection", () => {
    vi.spyOn(Math, "random").mockReturnValue(0);
    const state = initialState();
    const forced = 2;
    const move = pickMove({ ...state, nextBoard: forced });
    expect(move?.bi).toBe(forced);
  });

  it("decides to double when strongly ahead", () => {
    vi.spyOn(Math, "random").mockReturnValue(0.9);
    const state = initialState();
    state.local[0] = "X";
    state.local[1] = "X";
    const decision = shouldDouble(state);
    expect(decision).toBe(true);
  });

  it("declines a double when far behind", () => {
    const state = initialState();
    state.pendingDouble = "X";
    state.local[0] = "X";
    state.local[1] = "X";
    state.local[2] = "X";
    state.local[3] = "X";
    state.local[4] = "X";
    expect(shouldAcceptDouble(state)).toBe(false);
  });

  it("generates a local win commentary", () => {
    vi.spyOn(Math, "random").mockReturnValue(0);
    const state = initialState();
    state.boards[0][0] = "X";
    state.boards[0][1] = "X";
    const move = { bi: 0, ci: 2 };
    const after = applyMove(state, move);
    const comment = generateCommentary(state, after, move);
    expect(comment).toBe("Nice, you got that board!");
  });

  it("returns blunder commentary for a much worse move", () => {
    vi.spyOn(Math, "random").mockReturnValue(0);
    const state = initialState();
    state.boards[0][0] = "X";
    state.boards[0][1] = "X";
    state.nextBoard = 0;
    const bestMove = { bi: 0, ci: 2 };
    const badMove = { bi: 0, ci: 8 };
    const afterBad = applyMove(state, badMove);
    const comment = generateCommentary(state, afterBad, badMove);
    expect(comment).toBe("Oh no...");
    const afterBest = applyMove(state, bestMove);
    expect(afterBest.local[0]).toBe("X");
  });

  it("returns block commentary when player blocks a win", () => {
    const rolls = [0.3, 0.6, 0.1];
    vi.spyOn(Math, "random").mockImplementation(() => rolls.shift() ?? 0.1);
    const state = initialState();
    state.boards[0][0] = "O";
    state.boards[0][1] = "O";
    state.nextBoard = 0;
    const move = { bi: 0, ci: 2 };
    const after = applyMove(state, move);
    const comment = generateCommentary(state, after, move);
    const blockComments = [
      "Good block!",
      "You saw that coming.",
      "Nice defensive play.",
      "Denied!",
    ];
    expect(blockComments).toContain(comment);
  });
});
