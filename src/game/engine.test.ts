import { describe, expect, it } from "vitest";
import {
  computeBigResult,
  computeLocalResult,
  cloneBoards,
  evalWinner9,
  getWinningLineIndex,
  initialState,
  isLegalMove,
  legalMoves,
  other,
  type LocalResult,
  type Player,
} from "./engine";

function emptyBoard(): Array<Player | null> {
  return Array(9).fill(null);
}

describe("engine", () => {
  it("detects local wins in rows", () => {
    const cells = emptyBoard();
    cells[0] = "X";
    cells[1] = "X";
    cells[2] = "X";
    expect(evalWinner9(cells)).toBe("X");
  });

  it("detects local wins in columns", () => {
    const cells = emptyBoard();
    cells[1] = "O";
    cells[4] = "O";
    cells[7] = "O";
    expect(evalWinner9(cells)).toBe("O");
  });

  it("detects local wins in diagonals", () => {
    const cells = emptyBoard();
    cells[0] = "X";
    cells[4] = "X";
    cells[8] = "X";
    expect(evalWinner9(cells)).toBe("X");
  });

  it("returns draw for a full board with no winner", () => {
    const cells: Array<Player> = ["X", "O", "X", "X", "O", "O", "O", "X", "X"];
    expect(computeLocalResult(cells)).toBe("D");
  });

  it("returns winner for big board lines", () => {
    const local: LocalResult[] = ["X", "X", "X", null, null, null, null, null, null];
    expect(computeBigResult(local)).toBe("X");
  });

  it("returns draw when all local boards are decided with no winner", () => {
    const local: LocalResult[] = ["X", "O", "X", "X", "O", "O", "O", "X", "D"];
    expect(computeBigResult(local)).toBe("D");
  });

  it("switches players with other()", () => {
    expect(other("X")).toBe("O");
    expect(other("O")).toBe("X");
  });

  it("tracks winning line index for a local board", () => {
    const cells = emptyBoard();
    cells[6] = "O";
    cells[7] = "O";
    cells[8] = "O";
    expect(getWinningLineIndex(cells)).toBe(2);
  });

  it("clones boards without sharing row references", () => {
    const state = initialState();
    const clone = cloneBoards(state.boards);
    expect(clone).not.toBe(state.boards);
    expect(clone[0]).not.toBe(state.boards[0]);
    clone[0][0] = "X";
    expect(state.boards[0][0]).toBeNull();
  });

  it("initializes empty state", () => {
    const state = initialState();
    expect(state.turn).toBe("X");
    expect(state.result).toBeNull();
    expect(state.nextBoard).toBeNull();
    expect(state.local).toHaveLength(9);
    expect(state.boards).toHaveLength(9);
    expect(state.boards.every((b) => b.length === 9 && b.every((c) => c === null))).toBe(
      true
    );
    expect(state.local.every((r) => r === null)).toBe(true);
    expect(state.cubeValue).toBe(1);
    expect(state.cubeOwner).toBeNull();
    expect(state.pendingDouble).toBeNull();
  });

  it("lists legal moves based on nextBoard", () => {
    const state = initialState();
    state.nextBoard = 4;
    const moves = legalMoves(state);
    expect(moves.length).toBe(9);
    expect(moves.every((m) => m.bi === 4)).toBe(true);
  });

  it("rejects illegal moves for decided board or occupied cell", () => {
    const state = initialState();
    state.local[2] = "X";
    state.boards[0][0] = "O";
    expect(isLegalMove(state, { bi: 2, ci: 0 })).toBe(false);
    expect(isLegalMove(state, { bi: 0, ci: 0 })).toBe(false);
  });

  it("rejects illegal moves when forced to another board", () => {
    const state = initialState();
    state.nextBoard = 3;
    expect(isLegalMove(state, { bi: 0, ci: 1 })).toBe(false);
  });

  // Tic-Tac-Ku variant tests
  describe("Tic-Tac-Ku variant", () => {
    it("X wins with 5 boards", () => {
      const local: LocalResult[] = ["X", "X", "X", "X", "X", null, null, null, null];
      expect(computeBigResult(local, "tictacku")).toBe("X");
    });

    it("O wins with 5 boards", () => {
      const local: LocalResult[] = ["O", "X", "O", "X", "O", "X", "O", "O", null];
      expect(computeBigResult(local, "tictacku")).toBe("O");
    });

    it("4 boards is not enough to win", () => {
      const local: LocalResult[] = ["X", "X", "X", "X", null, null, null, null, null];
      expect(computeBigResult(local, "tictacku")).toBeNull();
    });

    it("game continues when remaining board could decide winner", () => {
      // X has 4, O has 4, 1 remaining - whoever wins that board wins
      const local: LocalResult[] = ["X", "X", "X", "X", "O", "O", "O", "O", null];
      expect(computeBigResult(local, "tictacku")).toBeNull();
    });

    it("draw when all boards decided and neither has 5", () => {
      const local: LocalResult[] = ["X", "X", "X", "X", "O", "O", "O", "O", "D"];
      expect(computeBigResult(local, "tictacku")).toBe("D");
    });

    it("no draw yet if a player can still reach 5", () => {
      // X has 4, O has 3, 2 remaining - X can still reach 5
      const local: LocalResult[] = ["X", "X", "X", "X", "O", "O", "O", null, null];
      expect(computeBigResult(local, "tictacku")).toBeNull();
    });
  });
});
