import SwiftUI

@Observable
public final class GameViewModel {
    public var state: GameState
    public var aiSide: Player?
    public var isThinking: Bool = false
    public var message: String?

    public init(aiSide: Player? = .O) {
        self.state = initialState()
        self.aiSide = aiSide
    }

    // MARK: - Game Status

    public var isGameOver: Bool {
        state.result != .undecided
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

    public var isHumanTurn: Bool {
        !isGameOver && state.turn != aiSide
    }

    // MARK: - Actions

    public func cellTapped(boardIndex bi: Int, cellIndex ci: Int) {
        let move = Move(bi: bi, ci: ci)
        guard isHumanTurn else { return }
        guard isLegalMove(state, move) else { return }

        state = applyMove(state, move)
        message = nil

        // Trigger AI move after a short delay
        if !isGameOver && state.turn == aiSide {
            triggerAIMove()
        }
    }

    public func newGame(humanPlays side: Player) {
        state = initialState()
        aiSide = side.other
        isThinking = false
        message = nil

        // If AI goes first
        if state.turn == aiSide {
            triggerAIMove()
        }
    }

    public func resetGame() {
        state = initialState()
        isThinking = false
        message = nil

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
        guard let move = pickMove(state, difficulty: .hard) else {
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
