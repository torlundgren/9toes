import Foundation

// MARK: - Types

public enum Player: String, Codable, Equatable {
    case X = "X"
    case O = "O"

    public var other: Player {
        self == .X ? .O : .X
    }
}

public enum Difficulty: String, Codable {
    case easy
    case medium
    case hard
}

public typealias Cell = Player?

public enum LocalResult: Equatable, Codable {
    case player(Player)
    case draw  // "D" in TypeScript
    case undecided

    public init(from decoder: Decoder) throws {
        let container = try decoder.singleValueContainer()
        if container.decodeNil() {
            self = .undecided
        } else {
            let value = try container.decode(String.self)
            switch value {
            case "X": self = .player(.X)
            case "O": self = .player(.O)
            case "D": self = .draw
            default: self = .undecided
            }
        }
    }

    public func encode(to encoder: Encoder) throws {
        var container = encoder.singleValueContainer()
        switch self {
        case .player(.X): try container.encode("X")
        case .player(.O): try container.encode("O")
        case .draw: try container.encode("D")
        case .undecided: try container.encodeNil()
        }
    }
}

public typealias GameResult = LocalResult

public struct Move: Equatable, Codable {
    public let bi: Int  // board index
    public let ci: Int  // cell index

    public init(bi: Int, ci: Int) {
        self.bi = bi
        self.ci = ci
    }
}

public struct GameState: Codable {
    public var boards: [[Cell]]
    public var local: [LocalResult]
    public var nextBoard: Int?
    public var turn: Player
    public var result: GameResult

    // Doubling cube
    public var cubeValue: Int
    public var cubeOwner: Player?
    public var pendingDouble: Player?

    public init(
        boards: [[Cell]] = Array(repeating: Array(repeating: nil, count: 9), count: 9),
        local: [LocalResult] = Array(repeating: .undecided, count: 9),
        nextBoard: Int? = nil,
        turn: Player = .X,
        result: GameResult = .undecided,
        cubeValue: Int = 1,
        cubeOwner: Player? = nil,
        pendingDouble: Player? = nil
    ) {
        self.boards = boards
        self.local = local
        self.nextBoard = nextBoard
        self.turn = turn
        self.result = result
        self.cubeValue = cubeValue
        self.cubeOwner = cubeOwner
        self.pendingDouble = pendingDouble
    }
}

// MARK: - Constants

/// All 8 winning lines (3 rows, 3 columns, 2 diagonals)
public let lines: [[Int]] = [
    [0, 1, 2],  // top row
    [3, 4, 5],  // middle row
    [6, 7, 8],  // bottom row
    [0, 3, 6],  // left column
    [1, 4, 7],  // middle column
    [2, 5, 8],  // right column
    [0, 4, 8],  // diagonal
    [2, 4, 6],  // anti-diagonal
]

// MARK: - Win Detection

/// Check if a player has won on a 3x3 board
public func evalWinner9(_ cells: [Cell]) -> Player? {
    for line in lines {
        let (a, b, c) = (line[0], line[1], line[2])
        if let v = cells[a], v == cells[b], v == cells[c] {
            return v
        }
    }
    return nil
}

/// Return the index of the winning line, if any
public func getWinningLineIndex(_ cells: [Cell]) -> Int? {
    for (i, line) in lines.enumerated() {
        let (a, b, c) = (line[0], line[1], line[2])
        if let v = cells[a], v == cells[b], v == cells[c] {
            return i
        }
    }
    return nil
}

/// Check if a 3x3 board is full
public func isFull9(_ cells: [Cell]) -> Bool {
    cells.allSatisfy { $0 != nil }
}

/// Compute the result of a local (3x3) board
public func computeLocalResult(_ cells: [Cell]) -> LocalResult {
    if let winner = evalWinner9(cells) {
        return .player(winner)
    }
    if isFull9(cells) {
        return .draw
    }
    return .undecided
}

/// Compute the overall game result from local board results
public func computeBigResult(_ local: [LocalResult]) -> GameResult {
    // Convert to cells for win check (draws treated as empty)
    let bigCells: [Cell] = local.map { result in
        switch result {
        case .player(let p): return p
        case .draw, .undecided: return nil
        }
    }

    if let winner = evalWinner9(bigCells) {
        return .player(winner)
    }

    // Draw if all locals are decided (not undecided)
    let allDone = local.allSatisfy { $0 != .undecided }
    return allDone ? .draw : .undecided
}

// MARK: - State Helpers

/// Create initial empty game state
public func initialState() -> GameState {
    GameState()
}

/// Clone boards array (for immutability)
public func cloneBoards(_ boards: [[Cell]]) -> [[Cell]] {
    boards.map { $0 }
}

// MARK: - Doubling Cube

/// Check if the current player can offer a double
public func canDouble(_ state: GameState) -> Bool {
    if state.result != .undecided { return false }  // Game over
    if state.pendingDouble != nil { return false }  // Already pending
    if state.cubeValue >= 64 { return false }       // Max value
    // Cube must be centered (nil) or owned by current player
    return state.cubeOwner == nil || state.cubeOwner == state.turn
}

// MARK: - Legal Moves

/// Returns all legal moves for the current state
public func legalMoves(_ state: GameState) -> [Move] {
    if state.result != .undecided { return [] }  // Game over

    var moves: [Move] = []
    for bi in 0..<9 {
        if state.local[bi] != .undecided { continue }  // Board decided
        if let next = state.nextBoard, next != bi { continue }  // Forced elsewhere
        for ci in 0..<9 {
            if state.boards[bi][ci] == nil {
                moves.append(Move(bi: bi, ci: ci))
            }
        }
    }
    return moves
}

/// Check if a move is legal in the current state
public func isLegalMove(_ state: GameState, _ move: Move) -> Bool {
    if state.result != .undecided { return false }
    if state.local[move.bi] != .undecided { return false }
    if let next = state.nextBoard, next != move.bi { return false }
    if state.boards[move.bi][move.ci] != nil { return false }
    return true
}
