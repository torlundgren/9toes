import Foundation

// MARK: - Scoring Helpers

/// Count how many lines a player can still win on a board
private func countOpenLines(_ cells: [Cell], _ player: Player) -> Int {
    let opp = player.other
    var count = 0
    for line in lines {
        let (a, b, c) = (line[0], line[1], line[2])
        if cells[a] != opp && cells[b] != opp && cells[c] != opp {
            count += 1
        }
    }
    return count
}

/// Count pieces in a line for a player
private func countInLine(_ cells: [Cell], _ line: [Int], _ player: Player) -> Int {
    line.filter { cells[$0] == player }.count
}

// MARK: - Move Scoring

/// Score a potential move using heuristics (exported for golden tests)
public func scoreMove(_ state: GameState, _ move: Move) -> Double {
    let bi = move.bi
    let ci = move.ci
    let boards = state.boards
    let local = state.local
    let turn = state.turn
    let opp = turn.other
    var score: Double = 0

    // Simulate placing the piece
    var newBoard = boards[bi]
    newBoard[ci] = turn

    // 1. WIN THE GAME (+1000)
    var localAfter = local
    if evalWinner9(newBoard) == turn {
        localAfter[bi] = .player(turn)
        if case .player(turn) = computeBigResult(localAfter) {
            return 1000  // Immediate win - take it!
        }
    }

    // 2. WIN A LOCAL BOARD (+100)
    if evalWinner9(newBoard) == turn {
        score += 100

        // Bonus if this board is on a big-board winning line
        let bigCells: [Cell] = localAfter.map { result in
            if case .player(let p) = result { return p }
            return nil
        }
        for line in lines {
            let myCount = countInLine(bigCells, line, turn)
            if myCount == 2 && line.contains(bi) {
                score += 50  // Getting 2-in-a-row on big board
            }
        }
    }

    // 3. BLOCK OPPONENT FROM WINNING LOCAL BOARD (+90)
    var oppBoard = boards[bi]
    oppBoard[ci] = opp
    if evalWinner9(oppBoard) == opp {
        score += 90
    }

    // 4. BLOCK OPPONENT FROM WINNING THE GAME (+500)
    var oppLocalAfter = local
    if evalWinner9(oppBoard) == opp {
        oppLocalAfter[bi] = .player(opp)
        if case .player(opp) = computeBigResult(oppLocalAfter) {
            score += 500
        }
    }

    // 5. CREATE TWO-IN-A-ROW on local board (+15)
    for line in lines {
        guard line.contains(ci) else { continue }
        let before = countInLine(boards[bi], line, turn)
        let after = countInLine(newBoard, line, turn)
        let oppInLine = countInLine(boards[bi], line, opp)
        if before == 1 && after == 2 && oppInLine == 0 {
            score += 15
        }
    }

    // 6. BLOCK OPPONENT TWO-IN-A-ROW (+12)
    for line in lines {
        guard line.contains(ci) else { continue }
        let oppCount = countInLine(boards[bi], line, opp)
        let myCount = countInLine(boards[bi], line, turn)
        if oppCount == 2 && myCount == 0 {
            score += 12
        }
    }

    // 7. POSITIONAL: center (+6), corners (+3)
    if ci == 4 {
        score += 6
    } else if [0, 2, 6, 8].contains(ci) {
        score += 3
    }

    // 8. WHERE DOES THIS SEND THE OPPONENT?
    let targetBoard = ci
    if local[targetBoard] != .undecided {
        // Sending to decided board = opponent gets free choice (bad)
        score -= 20
    } else {
        let targetCells = boards[targetBoard]
        // Penalty for sending them where they can win a board
        for line in lines {
            let oppCount = countInLine(targetCells, line, opp)
            let myCount = countInLine(targetCells, line, turn)
            if oppCount == 2 && myCount == 0 {
                score -= 25
            }
        }
        // Bonus for sending to a board where we threaten
        for line in lines {
            let myCount = countInLine(targetCells, line, turn)
            let oppCount = countInLine(targetCells, line, opp)
            if myCount == 2 && oppCount == 0 {
                score += 8  // They must block us
            }
        }
    }

    // 9. Prefer boards with more open lines for us
    score += Double(countOpenLines(newBoard, turn)) * 0.5

    return score
}

// MARK: - Move Selection

/// Scored move for internal sorting
private struct ScoredMove {
    let move: Move
    let score: Double
}

/// Pick the best move for the current player using heuristic scoring
public func pickMove(_ state: GameState, difficulty: Difficulty = .medium) -> Move? {
    let moves = legalMoves(state)
    if moves.isEmpty { return nil }

    // Easy: 15% chance of random move (blunder)
    if difficulty == .easy && Double.random(in: 0..<1) < 0.15 {
        return moves.randomElement()
    }

    // Score all moves
    var scored = moves.map { ScoredMove(move: $0, score: scoreMove(state, $0)) }

    // Sort descending by score
    scored.sort { $0.score > $1.score }

    let best = scored[0].score

    // Select based on difficulty
    let threshold: Double
    switch difficulty {
    case .easy:
        threshold = 50  // Wide range - picks from many moves
    case .hard:
        threshold = 3   // Tight range - near-optimal
    case .medium:
        threshold = 10  // Balanced play
    }

    let top = scored.filter { $0.score >= best - threshold }
    return top.randomElement()?.move
}

// MARK: - Position Evaluation

/// Evaluate position strength for a player (-100 to +100)
private func evaluatePosition(_ state: GameState, _ player: Player) -> Double {
    let opp = player.other
    var score: Double = 0

    // Count local board wins
    var myBoards = 0
    var oppBoards = 0
    for result in state.local {
        if case .player(player) = result { myBoards += 1 }
        else if case .player(opp) = result { oppBoards += 1 }
    }
    score += Double(myBoards - oppBoards) * 20

    // Count big-board threats (2-in-a-row)
    let bigCells: [Cell] = state.local.map { result in
        if case .player(let p) = result { return p }
        return nil
    }
    for line in lines {
        let myCount = countInLine(bigCells, line, player)
        let oppCount = countInLine(bigCells, line, opp)
        if myCount == 2 && oppCount == 0 { score += 15 }
        if oppCount == 2 && myCount == 0 { score -= 15 }
    }

    // Clamp to -100 to +100
    return max(-100, min(100, score))
}

// MARK: - Doubling Cube AI

/// Should AI offer a double?
public func shouldDouble(_ state: GameState) -> Bool {
    guard canDouble(state) else { return false }

    let positionScore = evaluatePosition(state, state.turn)

    // Double when ahead - threshold scales with cube value (more cautious at higher stakes)
    let threshold = 15.0 + Double(state.cubeValue) * 3.0
    return positionScore > threshold && Double.random(in: 0..<1) > 0.2
}

/// Should AI accept a double?
public func shouldAcceptDouble(_ state: GameState) -> Bool {
    guard let doubler = state.pendingDouble else { return true }

    let responder = doubler.other
    let positionScore = evaluatePosition(state, responder)

    // Accept unless clearly losing (score < -40)
    // At higher cube values, be slightly more conservative
    let threshold = -40.0 + Double(state.cubeValue)
    return positionScore > threshold
}

// MARK: - AI Commentary

private let goodMoveComments = [
    "Nice move!",
    "Well played.",
    "I see what you did there.",
    "Clever!",
    "Good choice.",
    "Solid move.",
    "I would've done the same.",
    "Strong play!",
]

private let greatMoveComments = [
    "Excellent move!",
    "Impressive!",
    "I didn't see that coming!",
    "Wow, nice one!",
    "That's a strong play.",
    "You're making this tough.",
]

private let badMoveComments = [
    "Interesting choice...",
    "Hmm, are you sure?",
    "Bold strategy.",
    "That's... unexpected.",
    "I wouldn't have done that.",
    "Okay then!",
    "If you say so...",
]

private let blunderComments = [
    "Oh no...",
    "That might be a mistake.",
    "Are you feeling okay?",
    "I'll take it!",
    "Thanks for that!",
    "You sure about that?",
]

private let localWinComments = [
    "Nice, you got that board!",
    "Well done on that one.",
    "One for you.",
    "You claimed that board.",
]

private let blockComments = [
    "Good block!",
    "You saw that coming.",
    "Nice defensive play.",
    "Denied!",
]

private let aiWinningComments = [
    "I'm feeling good about this.",
    "Things are going my way.",
    "I like my position here.",
]

private let aiLosingComments = [
    "You're playing well!",
    "I'm in trouble here.",
    "Okay, you've got the edge.",
]

/// Generate AI commentary on the player's move
public func generateCommentary(
    stateBefore: GameState,
    stateAfter: GameState,
    move: Move
) -> String? {
    // Only comment ~35% of the time to avoid being annoying
    guard Double.random(in: 0..<1) <= 0.35 else { return nil }

    let player = stateBefore.turn
    let moves = legalMoves(stateBefore)
    guard !moves.isEmpty else { return nil }

    // Score all moves to evaluate this one
    let scored = moves.map { (move: $0, score: scoreMove(stateBefore, $0)) }
        .sorted { $0.score > $1.score }

    let bestScore = scored[0].score
    let worstScore = scored[scored.count - 1].score
    let thisMove = scored.first { $0.move == move }
    let moveScore = thisMove?.score ?? 0
    let moveRank = scored.firstIndex { $0.move == move } ?? 0

    // Check if player won a local board
    let wonLocalBoard = stateBefore.local[move.bi] == .undecided &&
        stateAfter.local[move.bi] == .player(player)

    // Check if player blocked AI from winning a local board
    let aiPlayer = player.other
    var boardCopy = stateBefore.boards[move.bi]
    boardCopy[move.ci] = aiPlayer
    let blockedWin = evalWinner9(boardCopy) == aiPlayer

    // Position evaluation
    let positionBefore = evaluatePosition(stateBefore, aiPlayer)
    let positionAfter = evaluatePosition(stateAfter, aiPlayer)

    let scoreRange = bestScore - worstScore
    let scoreFromBest = bestScore - moveScore
    let isTopMove = moveRank <= 2 || scoreFromBest < 10
    let isGoodMove = scoreFromBest < scoreRange * 0.3
    let isBadMove = scoreFromBest > scoreRange * 0.6
    let isBlunder = scoreFromBest > scoreRange * 0.8 && scoreRange > 30

    // Prioritize specific events
    if wonLocalBoard {
        return localWinComments.randomElement()
    }

    if blockedWin && Double.random(in: 0..<1) > 0.5 {
        return blockComments.randomElement()
    }

    // Comment on move quality
    if isBlunder && scoreRange > 20 {
        return blunderComments.randomElement()
    }

    if isBadMove && scoreRange > 15 {
        return badMoveComments.randomElement()
    }

    if isTopMove && bestScore > 50 {
        return greatMoveComments.randomElement()
    }

    if isGoodMove {
        return goodMoveComments.randomElement()
    }

    // Comment on position change
    if positionAfter < positionBefore - 20 {
        return aiLosingComments.randomElement()
    }

    if positionAfter > positionBefore + 20 {
        return aiWinningComments.randomElement()
    }

    return nil
}
