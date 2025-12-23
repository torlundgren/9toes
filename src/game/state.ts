import {
  canDouble,
  cloneBoards,
  computeBigResult,
  computeLocalResult,
  other,
  type GameState,
  type Move,
  type Variant,
} from "./engine";

/** Apply a move to the state and return the new state (immutable) */
export function applyMove(state: GameState, move: Move, variant: Variant = "classic"): GameState {
  const { bi, ci } = move;

  const boards = cloneBoards(state.boards);
  const local = state.local.slice();

  boards[bi][ci] = state.turn;

  // Update local result for the played board.
  local[bi] = computeLocalResult(boards[bi]);

  // Determine next forced board.
  let nextBoard: number | null = ci;
  if (local[ci] !== null) nextBoard = null; // target board already decided -> free choice

  const result = computeBigResult(local, variant);

  return {
    boards,
    local,
    nextBoard,
    turn: result ? state.turn : other(state.turn),
    result,
    cubeValue: state.cubeValue,
    cubeOwner: state.cubeOwner,
    pendingDouble: null,
  };
}

/** Current player offers to double the cube */
export function offerDouble(state: GameState): GameState {
  if (!canDouble(state)) return state;
  return {
    ...state,
    boards: cloneBoards(state.boards),
    local: state.local.slice(),
    pendingDouble: state.turn,
  };
}

/** Opponent accepts the double */
export function acceptDouble(state: GameState): GameState {
  if (!state.pendingDouble) return state;
  const doubler = state.pendingDouble;
  const accepter = other(doubler);
  return {
    ...state,
    boards: cloneBoards(state.boards),
    local: state.local.slice(),
    cubeValue: state.cubeValue * 2,
    cubeOwner: accepter, // Accepter now owns the cube
    pendingDouble: null,
  };
}

/** Opponent declines the double - doubler wins at current cube value */
export function declineDouble(state: GameState): GameState {
  if (!state.pendingDouble) return state;
  const doubler = state.pendingDouble;
  return {
    ...state,
    boards: cloneBoards(state.boards),
    local: state.local.slice(),
    result: doubler, // Doubler wins
    pendingDouble: null,
  };
}
