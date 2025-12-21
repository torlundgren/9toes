import XCTest
@testable import NineToesEngine

// MARK: - Fixture Types

struct RuleFixture: Codable {
    let description: String
    let state: FixtureGameState
    let move: Move
    let expected: RuleExpected
}

struct RuleExpected: Codable {
    let nextBoard: Int?
    let turn: String?
    let result: String?
    let local_0: String?
    let local_2: String?
    let local_8: String?
}

struct AIFixture: Codable {
    let description: String
    let state: FixtureGameState
    let expectedMove: Move
    let reason: String
}

struct ScoringFixture: Codable {
    let description: String
    let state: FixtureGameState
    let move: Move
    let expectedScore: Int
}

/// Intermediate type for decoding JSON fixtures
struct FixtureGameState: Codable {
    let boards: [[String?]]
    let local: [String?]
    let nextBoard: Int?
    let turn: String
    let result: String?
    let cubeValue: Int
    let cubeOwner: String?
    let pendingDouble: String?

    func toGameState() -> GameState {
        let boards: [[Cell]] = self.boards.map { row in
            row.map { cell in
                guard let c = cell else { return nil }
                return c == "X" ? .X : .O
            }
        }

        let local: [LocalResult] = self.local.map { result in
            guard let r = result else { return .undecided }
            switch r {
            case "X": return .player(.X)
            case "O": return .player(.O)
            case "D": return .draw
            default: return .undecided
            }
        }

        let turn: Player = self.turn == "X" ? .X : .O

        let result: GameResult = {
            guard let r = self.result else { return .undecided }
            switch r {
            case "X": return .player(.X)
            case "O": return .player(.O)
            case "D": return .draw
            default: return .undecided
            }
        }()

        let cubeOwner: Player? = self.cubeOwner.flatMap { $0 == "X" ? .X : .O }
        let pendingDouble: Player? = self.pendingDouble.flatMap { $0 == "X" ? .X : .O }

        return GameState(
            boards: boards,
            local: local,
            nextBoard: self.nextBoard,
            turn: turn,
            result: result,
            cubeValue: self.cubeValue,
            cubeOwner: cubeOwner,
            pendingDouble: pendingDouble
        )
    }
}

// MARK: - Test Helpers

func loadFixture<T: Codable>(_ name: String) throws -> T {
    let url = Bundle.module.url(forResource: name, withExtension: "json", subdirectory: "Fixtures")!
    let data = try Data(contentsOf: url)
    return try JSONDecoder().decode(T.self, from: data)
}

// MARK: - Rule Invariant Tests

final class GoldenRuleTests: XCTestCase {

    func testForcedBoardToFreeChoice() throws {
        let fixture: RuleFixture = try loadFixture("forced-to-free-choice")
        let state = fixture.state.toGameState()
        let result = applyMove(state, fixture.move)

        XCTAssertNil(result.nextBoard, "Should be free choice (nil) when target board is decided")
    }

    func testForcedBoardConstraint() throws {
        let fixture: RuleFixture = try loadFixture("forced-board-constraint")
        let state = fixture.state.toGameState()
        let result = applyMove(state, fixture.move)

        XCTAssertEqual(result.nextBoard, fixture.expected.nextBoard)
        XCTAssertEqual(result.turn, fixture.expected.turn == "X" ? .X : .O)
    }

    func testLocalWinDetection() throws {
        let fixture: RuleFixture = try loadFixture("local-win-detection")
        let state = fixture.state.toGameState()
        let result = applyMove(state, fixture.move)

        XCTAssertEqual(result.local[0], .player(.X), "Board 0 should be won by X")
    }

    func testGameWinTopRow() throws {
        let fixture: RuleFixture = try loadFixture("game-win-top-row")
        let state = fixture.state.toGameState()
        let result = applyMove(state, fixture.move)

        XCTAssertEqual(result.result, .player(.X), "X should win the game")
        XCTAssertEqual(result.local[2], .player(.X), "Board 2 should be won by X")
    }

    func testDrawAllBoardsDecided() throws {
        let fixture: RuleFixture = try loadFixture("draw-all-boards-decided")
        let state = fixture.state.toGameState()
        let result = applyMove(state, fixture.move)

        XCTAssertEqual(result.result, .draw, "Game should be a draw")
        XCTAssertEqual(result.local[8], .draw, "Board 8 should be a draw")
    }
}

// MARK: - Basic Engine Tests

final class EngineTests: XCTestCase {

    func testInitialState() {
        let state = initialState()

        XCTAssertEqual(state.turn, .X)
        XCTAssertEqual(state.result, .undecided)
        XCTAssertNil(state.nextBoard)
        XCTAssertEqual(state.cubeValue, 1)
        XCTAssertNil(state.cubeOwner)
    }

    func testPlayerOther() {
        XCTAssertEqual(Player.X.other, .O)
        XCTAssertEqual(Player.O.other, .X)
    }

    func testEvalWinner9Row() {
        let cells: [Cell] = [.X, .X, .X, nil, nil, nil, nil, nil, nil]
        XCTAssertEqual(evalWinner9(cells), .X)
    }

    func testEvalWinner9Column() {
        let cells: [Cell] = [.O, nil, nil, .O, nil, nil, .O, nil, nil]
        XCTAssertEqual(evalWinner9(cells), .O)
    }

    func testEvalWinner9Diagonal() {
        let cells: [Cell] = [.X, nil, nil, nil, .X, nil, nil, nil, .X]
        XCTAssertEqual(evalWinner9(cells), .X)
    }

    func testEvalWinner9NoWinner() {
        let cells: [Cell] = [.X, .O, .X, nil, nil, nil, nil, nil, nil]
        XCTAssertNil(evalWinner9(cells))
    }

    func testIsFull9() {
        let full: [Cell] = [.X, .O, .X, .O, .X, .O, .X, .O, .X]
        let notFull: [Cell] = [.X, .O, .X, .O, nil, .O, .X, .O, .X]

        XCTAssertTrue(isFull9(full))
        XCTAssertFalse(isFull9(notFull))
    }

    func testLegalMovesInitial() {
        let state = initialState()
        let moves = legalMoves(state)

        // All 81 cells should be legal on empty board with no constraint
        XCTAssertEqual(moves.count, 81)
    }

    func testLegalMovesForced() {
        var state = initialState()
        state.nextBoard = 4

        let moves = legalMoves(state)

        // Only 9 cells in board 4 should be legal
        XCTAssertEqual(moves.count, 9)
        XCTAssertTrue(moves.allSatisfy { $0.bi == 4 })
    }

    func testIsLegalMove() {
        var state = initialState()
        state.nextBoard = 4

        XCTAssertTrue(isLegalMove(state, Move(bi: 4, ci: 0)))
        XCTAssertFalse(isLegalMove(state, Move(bi: 0, ci: 0)))  // Wrong board
    }
}

// MARK: - State Transition Tests

final class StateTests: XCTestCase {

    func testApplyMoveBasic() {
        let state = initialState()
        let move = Move(bi: 4, ci: 4)
        let result = applyMove(state, move)

        XCTAssertEqual(result.boards[4][4], .X)
        XCTAssertEqual(result.turn, .O)
        XCTAssertEqual(result.nextBoard, 4)  // Sent to board 4
    }

    func testApplyMoveSwitchesTurn() {
        let state = initialState()
        let after1 = applyMove(state, Move(bi: 0, ci: 4))
        let after2 = applyMove(after1, Move(bi: 4, ci: 0))

        XCTAssertEqual(after1.turn, .O)
        XCTAssertEqual(after2.turn, .X)
    }

    func testDoublingCube() {
        let state = initialState()

        // Offer double
        let offered = offerDouble(state)
        XCTAssertEqual(offered.pendingDouble, .X)

        // Accept double
        let accepted = acceptDouble(offered)
        XCTAssertEqual(accepted.cubeValue, 2)
        XCTAssertEqual(accepted.cubeOwner, .O)  // Accepter owns
        XCTAssertNil(accepted.pendingDouble)
    }

    func testDeclineDouble() {
        let state = initialState()
        let offered = offerDouble(state)
        let declined = declineDouble(offered)

        XCTAssertEqual(declined.result, .player(.X))  // Doubler wins
    }
}

// MARK: - AI Golden Tests (Must Not Blunder)

final class AIGoldenTests: XCTestCase {

    func testAITakesGameWinningMove() throws {
        let fixture: AIFixture = try loadFixture("ai-must-win-game")
        let state = fixture.state.toGameState()

        let move = pickMove(state, difficulty: .hard)

        XCTAssertEqual(move, fixture.expectedMove, "AI must take game-winning move")
    }

    func testAIBlocksOpponentGameWin() throws {
        let fixture: AIFixture = try loadFixture("ai-must-block-game")
        let state = fixture.state.toGameState()

        let move = pickMove(state, difficulty: .hard)

        XCTAssertEqual(move, fixture.expectedMove, "AI must block opponent's game-winning move")
    }

    func testAITakesLocalBoardWin() throws {
        let fixture: AIFixture = try loadFixture("ai-must-win-local")
        let state = fixture.state.toGameState()

        let move = pickMove(state, difficulty: .hard)

        XCTAssertEqual(move, fixture.expectedMove, "AI should take local board win")
    }

    func testAIBlocksLocalWinThreat() throws {
        let fixture: AIFixture = try loadFixture("ai-must-block-local")
        let state = fixture.state.toGameState()

        let move = pickMove(state, difficulty: .hard)

        XCTAssertEqual(move, fixture.expectedMove, "AI should block opponent's local win")
    }
}

// MARK: - Scoring Snapshot Tests

final class ScoringTests: XCTestCase {

    func testGameWinningMoveScores1000() throws {
        let fixture: ScoringFixture = try loadFixture("scoring-game-win")
        let state = fixture.state.toGameState()

        let score = scoreMove(state, fixture.move)

        XCTAssertEqual(score, Double(fixture.expectedScore), "Game-winning move should score 1000")
    }

    func testCenterScoresHigherThanCorner() {
        let state = GameState(
            boards: Array(repeating: Array(repeating: nil, count: 9), count: 9),
            local: Array(repeating: .undecided, count: 9),
            nextBoard: 4,
            turn: .X,
            result: .undecided,
            cubeValue: 1,
            cubeOwner: nil,
            pendingDouble: nil
        )

        let centerScore = scoreMove(state, Move(bi: 4, ci: 4))
        let cornerScore = scoreMove(state, Move(bi: 4, ci: 0))

        XCTAssertGreaterThan(centerScore, cornerScore)
    }

    func testBlockingLocalWinScoresAtLeast90() {
        var state = GameState(
            boards: Array(repeating: Array(repeating: nil, count: 9), count: 9),
            local: Array(repeating: .undecided, count: 9),
            nextBoard: 0,
            turn: .X,
            result: .undecided,
            cubeValue: 1,
            cubeOwner: nil,
            pendingDouble: nil
        )
        // O has 2 in a row on board 0
        state.boards[0][0] = .O
        state.boards[0][1] = .O

        let blockScore = scoreMove(state, Move(bi: 0, ci: 2))

        XCTAssertGreaterThanOrEqual(blockScore, 90, "Blocking local win should score at least 90")
    }

    func testWinningLocalBoardScoresAtLeast100() {
        var state = GameState(
            boards: Array(repeating: Array(repeating: nil, count: 9), count: 9),
            local: Array(repeating: .undecided, count: 9),
            nextBoard: 0,
            turn: .X,
            result: .undecided,
            cubeValue: 1,
            cubeOwner: nil,
            pendingDouble: nil
        )
        // X has 2 in a row on board 0
        state.boards[0][0] = .X
        state.boards[0][1] = .X

        let winScore = scoreMove(state, Move(bi: 0, ci: 2))

        XCTAssertGreaterThanOrEqual(winScore, 100, "Winning local board should score at least 100")
    }
}

// MARK: - AI Basic Tests

final class AITests: XCTestCase {

    func testPickMoveReturnsNilWhenNoMoves() {
        var state = initialState()
        state.local = Array(repeating: .draw, count: 9)

        let move = pickMove(state)

        XCTAssertNil(move)
    }

    func testPickMoveRespectsForcing() {
        var state = initialState()
        state.nextBoard = 4

        // Run multiple times to account for randomness
        for _ in 0..<10 {
            let move = pickMove(state)
            XCTAssertEqual(move?.bi, 4, "AI must respect forced board constraint")
        }
    }

    func testShouldAcceptDoubleWhenEven() {
        var state = initialState()
        state.pendingDouble = .X

        // Even position should accept
        XCTAssertTrue(shouldAcceptDouble(state))
    }

    func testShouldDeclineDoubleWhenFarBehind() {
        var state = initialState()
        state.pendingDouble = .X
        // X has won 5 boards - O is far behind
        state.local = [.player(.X), .player(.X), .player(.X), .player(.X), .player(.X),
                       .undecided, .undecided, .undecided, .undecided]

        XCTAssertFalse(shouldAcceptDouble(state))
    }
}
