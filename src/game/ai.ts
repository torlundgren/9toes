import {
  canDouble,
  LINES,
  computeBigResult,
  evalWinner9,
  legalMoves,
  other,
  type Cell,
  type GameState,
  type Move,
  type Player,
} from "./engine";

// ─────────────────────────────────────────────────────────────
// Scoring Helpers
// ─────────────────────────────────────────────────────────────

/** Count how many lines a player can still win on a board */
function countOpenLines(cells: Cell[], player: Player): number {
  const opp = other(player);
  let count = 0;
  for (const [a, b, c] of LINES) {
    if (cells[a] !== opp && cells[b] !== opp && cells[c] !== opp) {
      count++;
    }
  }
  return count;
}

/** Count pieces in a line for a player */
function countInLine(cells: Cell[], line: number[], player: Player): number {
  return line.filter((i) => cells[i] === player).length;
}

/** Score a potential move using heuristics */
function scoreMove(state: GameState, move: Move): number {
  const { bi, ci } = move;
  const { boards, local, turn } = state;
  const opp = other(turn);
  let score = 0;

  // Simulate placing the piece
  const newBoard = boards[bi].slice();
  newBoard[ci] = turn;

  // 1. WIN THE GAME (+1000)
  const localAfter = local.slice();
  if (evalWinner9(newBoard) === turn) {
    localAfter[bi] = turn;
    if (computeBigResult(localAfter) === turn) {
      return 1000; // Immediate win - take it!
    }
  }

  // 2. WIN A LOCAL BOARD (+100)
  if (evalWinner9(newBoard) === turn) {
    score += 100;

    // Bonus if this board is on a big-board winning line
    const bigCells: Cell[] = localAfter.map((r) =>
      r === "X" || r === "O" ? r : null
    );
    for (const line of LINES) {
      const myCount = countInLine(bigCells, line, turn);
      if (myCount === 2 && line.includes(bi)) {
        score += 50; // Getting 2-in-a-row on big board
      }
    }
  }

  // 3. BLOCK OPPONENT FROM WINNING LOCAL BOARD (+90)
  const oppBoard = boards[bi].slice();
  oppBoard[ci] = opp;
  if (evalWinner9(oppBoard) === opp) {
    score += 90;
  }

  // 4. BLOCK OPPONENT FROM WINNING THE GAME (+500)
  const oppLocalAfter = local.slice();
  if (evalWinner9(oppBoard) === opp) {
    oppLocalAfter[bi] = opp;
    if (computeBigResult(oppLocalAfter) === opp) {
      score += 500;
    }
  }

  // 5. CREATE TWO-IN-A-ROW on local board (+15)
  for (const line of LINES) {
    if (!line.includes(ci)) continue;
    const before = countInLine(boards[bi], line, turn);
    const after = countInLine(newBoard, line, turn);
    const oppInLine = countInLine(boards[bi], line, opp);
    if (before === 1 && after === 2 && oppInLine === 0) {
      score += 15;
    }
  }

  // 6. BLOCK OPPONENT TWO-IN-A-ROW (+12)
  for (const line of LINES) {
    if (!line.includes(ci)) continue;
    const oppCount = countInLine(boards[bi], line, opp);
    const myCount = countInLine(boards[bi], line, turn);
    if (oppCount === 2 && myCount === 0) {
      score += 12;
    }
  }

  // 7. POSITIONAL: center (+6), corners (+3)
  if (ci === 4) score += 6;
  else if ([0, 2, 6, 8].includes(ci)) score += 3;

  // 8. WHERE DOES THIS SEND THE OPPONENT?
  const targetBoard = ci;
  if (local[targetBoard] !== null) {
    // Sending to decided board = opponent gets free choice (bad)
    score -= 20;
  } else {
    const targetCells = boards[targetBoard];
    // Penalty for sending them where they can win a board
    for (const line of LINES) {
      const oppCount = countInLine(targetCells, line, opp);
      const myCount = countInLine(targetCells, line, turn);
      if (oppCount === 2 && myCount === 0) {
        score -= 25;
      }
    }
    // Bonus for sending to a board where we threaten
    for (const line of LINES) {
      const myCount = countInLine(targetCells, line, turn);
      const oppCount = countInLine(targetCells, line, opp);
      if (myCount === 2 && oppCount === 0) {
        score += 8; // They must block us
      }
    }
  }

  // 9. Prefer boards with more open lines for us
  score += countOpenLines(newBoard, turn) * 0.5;

  return score;
}

// ─────────────────────────────────────────────────────────────
// Public API
// ─────────────────────────────────────────────────────────────

/** Pick the best move for the current player using heuristic scoring */
export function pickMove(state: GameState): Move | null {
  const moves = legalMoves(state);
  if (moves.length === 0) return null;

  // Score all moves
  const scored = moves.map((m) => ({
    ...m,
    score: scoreMove(state, m),
  }));

  // Sort descending by score
  scored.sort((a, b) => b.score - a.score);

  // Pick randomly among top moves (within 10 points of best)
  const best = scored[0].score;
  const top = scored.filter((m) => m.score >= best - 10);

  return top[Math.floor(Math.random() * top.length)];
}

// ─────────────────────────────────────────────────────────────
// Doubling Cube AI
// ─────────────────────────────────────────────────────────────

/** Evaluate position strength for a player (-100 to +100) */
function evaluatePosition(state: GameState, player: Player): number {
  const opp = other(player);
  let score = 0;

  // Count local board wins
  let myBoards = 0;
  let oppBoards = 0;
  for (const result of state.local) {
    if (result === player) myBoards++;
    else if (result === opp) oppBoards++;
  }
  score += (myBoards - oppBoards) * 20;

  // Count big-board threats (2-in-a-row)
  const bigCells: Cell[] = state.local.map((r) =>
    r === "X" || r === "O" ? r : null
  );
  for (const line of LINES) {
    const myCount = countInLine(bigCells, line, player);
    const oppCount = countInLine(bigCells, line, opp);
    if (myCount === 2 && oppCount === 0) score += 15;
    if (oppCount === 2 && myCount === 0) score -= 15;
  }

  // Clamp to -100 to +100
  return Math.max(-100, Math.min(100, score));
}

/** Should AI offer a double? */
export function shouldDouble(state: GameState): boolean {
  if (!canDouble(state)) return false;

  const positionScore = evaluatePosition(state, state.turn);

  // Double when ahead - threshold scales with cube value (more cautious at higher stakes)
  const threshold = 15 + state.cubeValue * 3;
  return positionScore > threshold && Math.random() > 0.2;
}

/** Should AI accept a double? */
export function shouldAcceptDouble(state: GameState): boolean {
  if (!state.pendingDouble) return true;

  const responder = other(state.pendingDouble);
  const positionScore = evaluatePosition(state, responder);

  // Accept unless clearly losing (score < -40)
  // At higher cube values, be slightly more conservative
  const threshold = -40 + state.cubeValue;
  return positionScore > threshold;
}
