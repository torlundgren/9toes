import SwiftUI
import NineToesEngine

@Observable
public final class GameViewModel {
    public var state: GameState
    public var aiSide: Player?
    public var difficulty: Difficulty = .hard
    public var isThinking: Bool = false
    public var message: String?

    // Stats
    public var gamesPlayed: Int = 0
    public var humanWins: Int = 0
    public var aiWins: Int = 0
    public var draws: Int = 0

    // History for undo
    private var history: [GameState] = []

    public init(aiSide: Player? = .O, difficulty: Difficulty = .hard) {
        self.state = initialState()
        self.aiSide = aiSide
        self.difficulty = difficulty
    }

    // MARK: - Game Status

    public var isGameOver: Bool {
        state.result != .undecided
    }

    private func recordResult() {
        guard isGameOver else { return }
        gamesPlayed += 1
        switch state.result {
        case .player(let winner):
            if winner == aiSide {
                aiWins += 1
            } else {
                humanWins += 1
            }
        case .draw:
            draws += 1
        case .undecided:
            break
        }
    }

    public var currentPlayerName: String {
        if isGameOver {
            switch state.result {
            case .player(let p): return "\(p.rawValue) wins!"
            case .draw: return "Draw!"
            case .undecided: return ""
            }
        }
        return "\(state.turn.rawValue)'s turn"
    }

    public var moveCount: Int {
        state.boards.flatMap { $0 }.compactMap { $0 }.count
    }

    public var statusLine: String {
        if isGameOver {
            switch state.result {
            case .player(let p): return "\(p.rawValue) wins!\n\(moveCount) moves"
            case .draw: return "Draw!\n\(moveCount) moves"
            case .undecided: return ""
            }
        }
        let boardInfo: String
        if let forced = state.nextBoard {
            boardInfo = "Board \(forced + 1)"
        } else {
            boardInfo = "Any board"
        }
        return "\(state.turn.rawValue) to move\n\(boardInfo) • Move \(moveCount + 1)"
    }

    public var isHumanTurn: Bool {
        !isGameOver && state.turn != aiSide
    }

    public var canUndo: Bool {
        !history.isEmpty && !isThinking
    }

    public var humanCanDouble: Bool {
        isHumanTurn && canDouble(state) && state.pendingDouble == nil
    }

    public var hasPendingDouble: Bool {
        state.pendingDouble != nil
    }

    public var pendingDoubleFromAI: Bool {
        state.pendingDouble == aiSide
    }

    // MARK: - Actions

    public func cellTapped(boardIndex bi: Int, cellIndex ci: Int) {
        let move = Move(bi: bi, ci: ci)
        guard isHumanTurn else { return }
        guard isLegalMove(state, move) else { return }

        // Save state for undo (before human move)
        history.append(state)

        state = applyMove(state, move)
        message = nil

        if isGameOver {
            recordResult()
        } else if state.turn == aiSide {
            triggerAIMove()
        }
    }

    public func undo() {
        guard canUndo else { return }
        state = history.removeLast()
        message = nil
    }

    // MARK: - Doubling Cube

    public func offerDoubleFromHuman() {
        guard humanCanDouble else { return }
        history.append(state)
        state = offerDouble(state)

        // AI decides whether to accept
        DispatchQueue.main.asyncAfter(deadline: .now() + 0.3) { [weak self] in
            self?.aiRespondToDouble()
        }
    }

    private func aiRespondToDouble() {
        if shouldAcceptDouble(state) {
            state = acceptDouble(state)
            message = "I'll take that action!"
        } else {
            state = declineDouble(state)
            message = "You win this time... I fold."
            recordResult()
        }
    }

    public func acceptDoubleFromHuman() {
        guard pendingDoubleFromAI else { return }
        state = acceptDouble(state)
        message = nil

        // AI offered the double, so it's still AI's turn - trigger AI move
        if state.turn == aiSide {
            triggerAIMove()
        }
    }

    public func declineDoubleFromHuman() {
        guard pendingDoubleFromAI else { return }
        state = declineDouble(state)
        message = nil
        recordResult()
    }

    public func newGame(humanPlays side: Player, difficulty: Difficulty = .hard) {
        state = initialState()
        aiSide = side.other
        self.difficulty = difficulty
        isThinking = false
        message = nil
        history = []

        // If AI goes first
        if state.turn == aiSide {
            triggerAIMove()
        }
    }

    public func resetGame() {
        state = initialState()
        isThinking = false
        message = nil
        history = []

        if state.turn == aiSide {
            triggerAIMove()
        }
    }

    public func restart() {
        // Same as resetGame but keeps aiSide and difficulty
        state = initialState()
        isThinking = false
        message = nil
        history = []

        if state.turn == aiSide {
            triggerAIMove()
        }
    }

    // MARK: - AI

    private func triggerAIMove() {
        isThinking = true

        // Small delay so the UI feels natural
        DispatchQueue.main.asyncAfter(deadline: .now() + 0.4) { [weak self] in
            self?.performAIMove()
        }
    }

    private func performAIMove() {
        // Check if AI should offer a double first
        if shouldDouble(state) {
            state = offerDouble(state)
            isThinking = false
            message = "I'm doubling! Accept or fold?"
            return
        }

        guard let move = pickMove(state, difficulty: difficulty) else {
            isThinking = false
            return
        }

        let before = state
        state = applyMove(state, move)
        isThinking = false

        // Generate commentary
        if let comment = generateCommentary(stateBefore: before, stateAfter: state, move: move) {
            message = comment
        }

        if isGameOver {
            recordResult()
        }
    }

    // MARK: - Board Helpers

    public func isBoardPlayable(_ bi: Int) -> Bool {
        guard !isGameOver else { return false }
        guard state.local[bi] == .undecided else { return false }
        if let forced = state.nextBoard {
            return forced == bi
        }
        return true
    }

    public func isCellPlayable(boardIndex bi: Int, cellIndex ci: Int) -> Bool {
        guard isHumanTurn else { return false }
        return isLegalMove(state, Move(bi: bi, ci: ci))
    }
}
