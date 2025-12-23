import {
  canDouble,
  LINES,
  computeBigResult,
  evalWinner9,
  legalMoves,
  other,
  type Cell,
  type Difficulty,
  type GameState,
  type Move,
  type Player,
  type Variant,
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

/** Score a potential move using heuristics (exported for golden tests) */
export function scoreMove(state: GameState, move: Move, variant: Variant = "classic"): number {
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
    if (computeBigResult(localAfter, variant) === turn) {
      return 1000; // Immediate win - take it!
    }
  }

  // 2. WIN A LOCAL BOARD
  if (evalWinner9(newBoard) === turn) {
    // In Tic-Tac-Ku, winning boards is more valuable since you need 5
    score += variant === "tictacku" ? 120 : 100;

    // In classic mode, bonus if this board is on a big-board winning line
    if (variant === "classic") {
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
  }

  // 3. BLOCK OPPONENT FROM WINNING LOCAL BOARD
  const oppBoard = boards[bi].slice();
  oppBoard[ci] = opp;
  if (evalWinner9(oppBoard) === opp) {
    // In Tic-Tac-Ku, blocking is more important
    score += variant === "tictacku" ? 110 : 90;
  }

  // 4. BLOCK OPPONENT FROM WINNING THE GAME (+500)
  const oppLocalAfter = local.slice();
  if (evalWinner9(oppBoard) === opp) {
    oppLocalAfter[bi] = opp;
    if (computeBigResult(oppLocalAfter, variant) === opp) {
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
export function pickMove(state: GameState, difficulty: Difficulty = "medium", variant: Variant = "classic"): Move | null {
  const moves = legalMoves(state);
  if (moves.length === 0) return null;

  // Easy: 15% chance of random move (blunder)
  if (difficulty === "easy" && Math.random() < 0.15) {
    return moves[Math.floor(Math.random() * moves.length)];
  }

  // Score all moves
  const scored = moves.map((m) => ({
    ...m,
    score: scoreMove(state, m, variant),
  }));

  // Sort descending by score
  scored.sort((a, b) => b.score - a.score);

  const best = scored[0].score;

  // Select based on difficulty
  let threshold: number;
  switch (difficulty) {
    case "easy":
      threshold = 50; // Wide range - picks from many moves
      break;
    case "hard":
      threshold = 3; // Tight range - near-optimal
      break;
    case "medium":
    default:
      threshold = 10; // Current balanced play
  }

  const top = scored.filter((m) => m.score >= best - threshold);
  return top[Math.floor(Math.random() * top.length)];
}

// ─────────────────────────────────────────────────────────────
// Doubling Cube AI
// ─────────────────────────────────────────────────────────────

/** Evaluate position strength for a player (-100 to +100) */
function evaluatePosition(state: GameState, player: Player, variant: Variant = "classic"): number {
  const opp = other(player);
  let score = 0;

  // Count local board wins
  let myBoards = 0;
  let oppBoards = 0;
  for (const result of state.local) {
    if (result === player) myBoards++;
    else if (result === opp) oppBoards++;
  }
  // In Tic-Tac-Ku, each board win is worth more
  const boardValue = variant === "tictacku" ? 15 : 20;
  score += (myBoards - oppBoards) * boardValue;

  // In classic mode, count big-board threats (2-in-a-row)
  if (variant === "classic") {
    const bigCells: Cell[] = state.local.map((r) =>
      r === "X" || r === "O" ? r : null
    );
    for (const line of LINES) {
      const myCount = countInLine(bigCells, line, player);
      const oppCount = countInLine(bigCells, line, opp);
      if (myCount === 2 && oppCount === 0) score += 15;
      if (oppCount === 2 && myCount === 0) score -= 15;
    }
  } else {
    // Tic-Tac-Ku: bonus for being closer to 5
    if (myBoards >= 4) score += 25;
    if (oppBoards >= 4) score -= 25;
  }

  // Clamp to -100 to +100
  return Math.max(-100, Math.min(100, score));
}

/** Should AI offer a double? */
export function shouldDouble(state: GameState, variant: Variant = "classic"): boolean {
  if (!canDouble(state)) return false;

  const positionScore = evaluatePosition(state, state.turn, variant);

  // Double when ahead - threshold scales with cube value (more cautious at higher stakes)
  const threshold = 15 + state.cubeValue * 3;
  return positionScore > threshold && Math.random() > 0.2;
}

/** Should AI accept a double? */
export function shouldAcceptDouble(state: GameState, variant: Variant = "classic"): boolean {
  if (!state.pendingDouble) return true;

  const responder = other(state.pendingDouble);
  const positionScore = evaluatePosition(state, responder, variant);

  // Accept unless clearly losing (score < -40)
  // At higher cube values, be slightly more conservative
  const threshold = -40 + state.cubeValue;
  return positionScore > threshold;
}

// ─────────────────────────────────────────────────────────────
// AI Commentary
// ─────────────────────────────────────────────────────────────

const GOOD_MOVE_COMMENTS = [
  "Nice move!",
  "Well played.",
  "I see what you did there.",
  "Clever!",
  "Good choice.",
  "Solid move.",
  "I would've done the same.",
  "Strong play!",
];

const GREAT_MOVE_COMMENTS = [
  "Excellent move!",
  "Impressive!",
  "I didn't see that coming!",
  "Wow, nice one!",
  "That's a strong play.",
  "You're making this tough.",
];

const BAD_MOVE_COMMENTS = [
  "Interesting choice...",
  "Hmm, are you sure?",
  "Bold strategy.",
  "That's... unexpected.",
  "I wouldn't have done that.",
  "Okay then!",
  "If you say so...",
];

const BLUNDER_COMMENTS = [
  "Oh no...",
  "That might be a mistake.",
  "Are you feeling okay?",
  "I'll take it!",
  "Thanks for that!",
  "You sure about that?",
];

const LOCAL_WIN_COMMENTS = [
  "Nice, you got that board!",
  "Well done on that one.",
  "One for you.",
  "You claimed that board.",
];

const BLOCK_COMMENTS = [
  "Good block!",
  "You saw that coming.",
  "Nice defensive play.",
  "Denied!",
];

const AI_WINNING_COMMENTS = [
  "I'm feeling good about this.",
  "Things are going my way.",
  "I like my position here.",
];

const AI_LOSING_COMMENTS = [
  "You're playing well!",
  "I'm in trouble here.",
  "Okay, you've got the edge.",
];

function pick<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

/** Generate AI commentary on the player's move */
export function generateCommentary(
  stateBefore: GameState,
  stateAfter: GameState,
  move: Move,
  variant: Variant = "classic"
): string | null {
  // Only comment ~30% of the time to avoid being annoying
  if (Math.random() > 0.35) return null;

  const player = stateBefore.turn;
  const moves = legalMoves(stateBefore);
  if (moves.length === 0) return null;

  // Score all moves to evaluate this one
  const scored = moves.map((m) => ({
    move: m,
    score: scoreMove(stateBefore, m, variant),
  }));
  scored.sort((a, b) => b.score - a.score);

  const bestScore = scored[0].score;
  const worstScore = scored[scored.length - 1].score;
  const thisMove = scored.find((s) => s.move.bi === move.bi && s.move.ci === move.ci);
  const moveScore = thisMove?.score ?? 0;
  const moveRank = scored.findIndex((s) => s.move.bi === move.bi && s.move.ci === move.ci);

  // Check if player won a local board
  const wonLocalBoard = stateBefore.local[move.bi] === null &&
    (stateAfter.local[move.bi] === player);

  // Check if player blocked AI from winning a local board
  const aiPlayer = other(player);
  const boardCopy = stateBefore.boards[move.bi].slice();
  boardCopy[move.ci] = aiPlayer;
  const blockedWin = evalWinner9(boardCopy) === aiPlayer;

  // Position evaluation
  const positionBefore = evaluatePosition(stateBefore, aiPlayer, variant);
  const positionAfter = evaluatePosition(stateAfter, aiPlayer, variant);

  const scoreRange = bestScore - worstScore;
  const scoreFromBest = bestScore - moveScore;
  const isTopMove = moveRank <= 2 || scoreFromBest < 10;
  const isGoodMove = scoreFromBest < scoreRange * 0.3;
  const isBadMove = scoreFromBest > scoreRange * 0.6;
  const isBlunder = scoreFromBest > scoreRange * 0.8 && scoreRange > 30;

  // Prioritize specific events
  if (wonLocalBoard) {
    return pick(LOCAL_WIN_COMMENTS);
  }

  if (blockedWin && Math.random() > 0.5) {
    return pick(BLOCK_COMMENTS);
  }

  // Comment on move quality
  if (isBlunder && scoreRange > 20) {
    return pick(BLUNDER_COMMENTS);
  }

  if (isBadMove && scoreRange > 15) {
    return pick(BAD_MOVE_COMMENTS);
  }

  if (isTopMove && bestScore > 50) {
    return pick(GREAT_MOVE_COMMENTS);
  }

  if (isGoodMove) {
    return pick(GOOD_MOVE_COMMENTS);
  }

  // Comment on position change
  if (positionAfter < positionBefore - 20) {
    return pick(AI_LOSING_COMMENTS);
  }

  if (positionAfter > positionBefore + 20) {
    return pick(AI_WINNING_COMMENTS);
  }

  return null;
}
