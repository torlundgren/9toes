import Foundation

// MARK: - State Transitions

/// Apply a move to the state and return the new state (immutable)
public func applyMove(_ state: GameState, _ move: Move) -> GameState {
    let bi = move.bi
    let ci = move.ci

    var boards = cloneBoards(state.boards)
    var local = state.local

    boards[bi][ci] = state.turn

    // Update local result for the played board
    local[bi] = computeLocalResult(boards[bi])

    // Determine next forced board
    var nextBoard: Int? = ci
    if local[ci] != .undecided {
        // Target board already decided -> free choice
        nextBoard = nil
    }

    let result = computeBigResult(local)

    // Turn only switches if game isn't over
    let nextTurn = result == .undecided ? state.turn.other : state.turn

    return GameState(
        boards: boards,
        local: local,
        nextBoard: nextBoard,
        turn: nextTurn,
        result: result,
        cubeValue: state.cubeValue,
        cubeOwner: state.cubeOwner,
        pendingDouble: nil
    )
}

// MARK: - Doubling Cube Operations

/// Current player offers to double the cube
public func offerDouble(_ state: GameState) -> GameState {
    guard canDouble(state) else { return state }

    return GameState(
        boards: cloneBoards(state.boards),
        local: state.local,
        nextBoard: state.nextBoard,
        turn: state.turn,
        result: state.result,
        cubeValue: state.cubeValue,
        cubeOwner: state.cubeOwner,
        pendingDouble: state.turn
    )
}

/// Opponent accepts the double
public func acceptDouble(_ state: GameState) -> GameState {
    guard let doubler = state.pendingDouble else { return state }
    let accepter = doubler.other

    return GameState(
        boards: cloneBoards(state.boards),
        local: state.local,
        nextBoard: state.nextBoard,
        turn: state.turn,
        result: state.result,
        cubeValue: state.cubeValue * 2,
        cubeOwner: accepter,  // Accepter now owns the cube
        pendingDouble: nil
    )
}

/// Opponent declines the double - doubler wins at current cube value
public func declineDouble(_ state: GameState) -> GameState {
    guard let doubler = state.pendingDouble else { return state }

    return GameState(
        boards: cloneBoards(state.boards),
        local: state.local,
        nextBoard: state.nextBoard,
        turn: state.turn,
        result: .player(doubler),  // Doubler wins
        cubeValue: state.cubeValue,
        cubeOwner: state.cubeOwner,
        pendingDouble: nil
    )
}
