/**
 * Golden Tests for 9Toes
 *
 * These tests lock in known-good behavior for:
 * 1. Rule invariants (forced board, free choice, win detection)
 * 2. AI sanity (must not miss obvious wins/blocks)
 * 3. Scoring snapshots (exact heuristic values)
 *
 * Purpose:
 * - Catch regressions during refactoring
 * - Verify identical behavior when porting to Swift
 * - Protect "behavior you like" from accidental changes
 *
 * The fixtures are stored as JSON files that can be loaded
 * by both TypeScript and Swift test suites.
 */

import { describe, expect, it, vi, afterEach } from "vitest";
import { applyMove } from "./state";
import { pickMove, scoreMove } from "./ai";
import type { GameState, Move } from "./engine";

// Import fixtures
import forcedToFreeChoice from "./fixtures/forced-to-free-choice.json";
import forcedBoardConstraint from "./fixtures/forced-board-constraint.json";
import localWinDetection from "./fixtures/local-win-detection.json";
import gameWinTopRow from "./fixtures/game-win-top-row.json";
import drawAllBoardsDecided from "./fixtures/draw-all-boards-decided.json";
import aiMustWinGame from "./fixtures/ai-must-win-game.json";
import aiMustBlockGame from "./fixtures/ai-must-block-game.json";
import aiMustWinLocal from "./fixtures/ai-must-win-local.json";
import aiMustBlockLocal from "./fixtures/ai-must-block-local.json";
import scoringGameWin from "./fixtures/scoring-game-win.json";

// ─────────────────────────────────────────────────────────────
// Rule Invariant Tests
// ─────────────────────────────────────────────────────────────

describe("Golden: Rule Invariants", () => {
  it("forced board -> decided board -> free choice", () => {
    const state = forcedToFreeChoice.state as GameState;
    const move = forcedToFreeChoice.move as Move;
    const result = applyMove(state, move);

    expect(result.nextBoard).toBe(forcedToFreeChoice.expected.nextBoard);
  });

  it("playing to cell N forces opponent to board N", () => {
    const state = forcedBoardConstraint.state as GameState;
    const move = forcedBoardConstraint.move as Move;
    const result = applyMove(state, move);

    expect(result.nextBoard).toBe(forcedBoardConstraint.expected.nextBoard);
    expect(result.turn).toBe(forcedBoardConstraint.expected.turn);
  });

  it("completing 3-in-a-row wins local board", () => {
    const state = localWinDetection.state as GameState;
    const move = localWinDetection.move as Move;
    const result = applyMove(state, move);

    expect(result.local[0]).toBe(localWinDetection.expected.local_0);
  });

  it("winning 3 boards in a row wins the game", () => {
    const state = gameWinTopRow.state as GameState;
    const move = gameWinTopRow.move as Move;
    const result = applyMove(state, move);

    expect(result.result).toBe(gameWinTopRow.expected.result);
    expect(result.local[2]).toBe(gameWinTopRow.expected.local_2);
  });

  it("all boards decided with no winner -> draw", () => {
    const state = drawAllBoardsDecided.state as GameState;
    const move = drawAllBoardsDecided.move as Move;
    const result = applyMove(state, move);

    expect(result.result).toBe(drawAllBoardsDecided.expected.result);
    expect(result.local[8]).toBe(drawAllBoardsDecided.expected.local_8);
  });
});

// ─────────────────────────────────────────────────────────────
// AI Sanity Tests (Must Win / Must Block)
// ─────────────────────────────────────────────────────────────

describe("Golden: AI Must Not Blunder", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("AI takes game-winning move (hard mode)", () => {
    // Ensure deterministic selection
    vi.spyOn(Math, "random").mockReturnValue(0);

    const state = aiMustWinGame.state as GameState;
    const expected = aiMustWinGame.expectedMove as Move;

    const move = pickMove(state, "hard");

    expect(move).toMatchObject(expected);
  });

  it("AI blocks opponent's game-winning move (hard mode)", () => {
    vi.spyOn(Math, "random").mockReturnValue(0);

    const state = aiMustBlockGame.state as GameState;
    const expected = aiMustBlockGame.expectedMove as Move;

    const move = pickMove(state, "hard");

    expect(move).toMatchObject(expected);
  });

  it("AI takes local board win when available (hard mode)", () => {
    vi.spyOn(Math, "random").mockReturnValue(0);

    const state = aiMustWinLocal.state as GameState;
    const expected = aiMustWinLocal.expectedMove as Move;

    const move = pickMove(state, "hard");

    expect(move).toMatchObject(expected);
  });

  it("AI blocks opponent's local win threat (hard mode)", () => {
    vi.spyOn(Math, "random").mockReturnValue(0);

    const state = aiMustBlockLocal.state as GameState;
    const expected = aiMustBlockLocal.expectedMove as Move;

    const move = pickMove(state, "hard");

    expect(move).toMatchObject(expected);
  });

  it("AI never misses game win even on easy mode", () => {
    // Easy mode has 15% blunder chance, but game wins should override
    vi.spyOn(Math, "random").mockReturnValue(0.5); // Not a blunder roll

    const state = aiMustWinGame.state as GameState;
    const expected = aiMustWinGame.expectedMove as Move;

    const move = pickMove(state, "easy");

    expect(move).toMatchObject(expected);
  });
});

// ─────────────────────────────────────────────────────────────
// Scoring Snapshot Tests
// ─────────────────────────────────────────────────────────────

describe("Golden: Scoring Snapshots", () => {
  it("game-winning move scores exactly 1000", () => {
    const state = scoringGameWin.state as GameState;
    const move = scoringGameWin.move as Move;

    const score = scoreMove(state, move);

    expect(score).toBe(scoringGameWin.expectedScore);
  });

  it("center cell scores higher than corner on empty board", () => {
    const state: GameState = {
      boards: Array.from({ length: 9 }, () => Array(9).fill(null)),
      local: Array(9).fill(null),
      nextBoard: 4,
      turn: "X",
      result: null,
      cubeValue: 1,
      cubeOwner: null,
      pendingDouble: null,
    };

    const centerScore = scoreMove(state, { bi: 4, ci: 4 });
    const cornerScore = scoreMove(state, { bi: 4, ci: 0 });

    expect(centerScore).toBeGreaterThan(cornerScore);
  });

  it("blocking a local win scores 90 points", () => {
    // O has 2 in a row, X blocks
    const state: GameState = {
      boards: Array.from({ length: 9 }, () => Array(9).fill(null)),
      local: Array(9).fill(null),
      nextBoard: 0,
      turn: "X",
      result: null,
      cubeValue: 1,
      cubeOwner: null,
      pendingDouble: null,
    };
    state.boards[0][0] = "O";
    state.boards[0][1] = "O";

    const blockScore = scoreMove(state, { bi: 0, ci: 2 });

    // Block opponent local win = 90, plus positional bonus
    expect(blockScore).toBeGreaterThanOrEqual(90);
  });

  it("winning a local board scores at least 100 points", () => {
    const state: GameState = {
      boards: Array.from({ length: 9 }, () => Array(9).fill(null)),
      local: Array(9).fill(null),
      nextBoard: 0,
      turn: "X",
      result: null,
      cubeValue: 1,
      cubeOwner: null,
      pendingDouble: null,
    };
    state.boards[0][0] = "X";
    state.boards[0][1] = "X";

    const winScore = scoreMove(state, { bi: 0, ci: 2 });

    expect(winScore).toBeGreaterThanOrEqual(100);
  });
});
