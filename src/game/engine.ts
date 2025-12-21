export type Player = "X" | "O";
export type Cell = Player | null;
export type LocalResult = Player | "D" | null; // D = draw (full, no winner)
export type GameResult = Player | "D" | null;
export type Move = { bi: number; ci: number };

export interface GameState {
  boards: Cell[][];
  local: LocalResult[];
  nextBoard: number | null;
  turn: Player;
  result: GameResult;
  // Doubling cube (optional feature)
  cubeValue: number;           // 1, 2, 4, 8, 16, 32, 64
  cubeOwner: Player | null;    // null = centered (anyone can double), Player = only they can double
  pendingDouble: Player | null; // Player who offered a double, awaiting response
}

export const LINES: number[][] = [
  [0, 1, 2],
  [3, 4, 5],
  [6, 7, 8],
  [0, 3, 6],
  [1, 4, 7],
  [2, 5, 8],
  [0, 4, 8],
  [2, 4, 6],
];

export function other(p: Player): Player {
  return p === "X" ? "O" : "X";
}

export function evalWinner9(cells: Cell[]): Player | null {
  for (const [a, b, c] of LINES) {
    const v = cells[a];
    if (v && v === cells[b] && v === cells[c]) return v;
  }
  return null;
}

export function getWinningLineIndex(cells: Cell[]): number | null {
  for (let i = 0; i < LINES.length; i++) {
    const [a, b, c] = LINES[i];
    const v = cells[a];
    if (v && v === cells[b] && v === cells[c]) return i;
  }
  return null;
}

export function isFull9(cells: Cell[]): boolean {
  for (let i = 0; i < 9; i++) if (!cells[i]) return false;
  return true;
}

export function computeLocalResult(cells: Cell[]): LocalResult {
  const w = evalWinner9(cells);
  if (w) return w;
  if (isFull9(cells)) return "D";
  return null;
}

export function computeBigResult(local: LocalResult[]): GameResult {
  // Treat "D" as not owned by either player for win-lines
  const bigCells: Cell[] = local.map((r) => (r === "X" || r === "O" ? r : null));
  const w = evalWinner9(bigCells);
  if (w) return w;

  // Draw if all locals are decided (X/O/D)
  const allDone = local.every((r) => r !== null);
  return allDone ? "D" : null;
}

export function initialState(): GameState {
  return {
    boards: Array.from({ length: 9 }, () => Array<Cell>(9).fill(null)),
    local: Array<LocalResult>(9).fill(null),
    nextBoard: null,
    turn: "X",
    result: null,
    cubeValue: 1,
    cubeOwner: null,
    pendingDouble: null,
  };
}

export function cloneBoards(boards: Cell[][]): Cell[][] {
  return boards.map((b) => b.slice());
}

/** Check if the current player can offer a double */
export function canDouble(state: GameState): boolean {
  if (state.result) return false; // Game over
  if (state.pendingDouble) return false; // Already a pending double
  if (state.cubeValue >= 64) return false; // Max cube value
  // Cube must be centered (null) or owned by current player
  return state.cubeOwner === null || state.cubeOwner === state.turn;
}

/** Returns all legal moves for the current state */
export function legalMoves(state: GameState): Move[] {
  if (state.result) return []; // Game is over

  const moves: Move[] = [];
  for (let bi = 0; bi < 9; bi++) {
    if (state.local[bi] !== null) continue; // Board already decided
    if (state.nextBoard !== null && state.nextBoard !== bi) continue; // Forced elsewhere
    for (let ci = 0; ci < 9; ci++) {
      if (state.boards[bi][ci] === null) {
        moves.push({ bi, ci });
      }
    }
  }
  return moves;
}

/** Checks if a move is legal in the current state */
export function isLegalMove(state: GameState, move: Move): boolean {
  if (state.result) return false; // Game is over
  if (state.local[move.bi] !== null) return false; // Board already decided
  if (state.nextBoard !== null && state.nextBoard !== move.bi) return false; // Forced elsewhere
  if (state.boards[move.bi][move.ci] !== null) return false; // Cell occupied
  return true;
}
