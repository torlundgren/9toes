import SwiftUI
import NineToesEngine

struct GameView: View {
    @State private var viewModel = GameViewModel()
    @State private var showingSideSelect = true

    public init() {}

    public var body: some View {
        VStack(spacing: 20) {
            // Header with buttons
            HStack {
                Text("9Toes")
                    .font(.largeTitle.bold())

                Spacer()

                Button("Undo") {
                    viewModel.undo()
                }
                .buttonStyle(.bordered)
                .disabled(!viewModel.canUndo)

                Button("Restart") {
                    viewModel.restart()
                }
                .buttonStyle(.bordered)

                // Double button
                if viewModel.humanCanDouble {
                    Button("Double") {
                        viewModel.offerDoubleFromHuman()
                    }
                    .buttonStyle(.borderedProminent)
                    .tint(.orange)
                }
            }

            // Cube value display
            if viewModel.state.cubeValue > 1 {
                HStack(spacing: 4) {
                    Text("Cube:")
                        .font(.subheadline)
                        .foregroundStyle(.secondary)
                    Text("\(viewModel.state.cubeValue)")
                        .font(.subheadline.bold())
                        .foregroundStyle(.orange)
                    if let owner = viewModel.state.cubeOwner {
                        Text("(\(owner.rawValue))")
                            .font(.caption)
                            .foregroundStyle(.secondary)
                    }
                }
            }

            // Double offer from AI - Accept/Decline
            if viewModel.pendingDoubleFromAI {
                HStack(spacing: 16) {
                    Text("AI doubles to \(viewModel.state.cubeValue * 2)!")
                        .font(.headline)
                        .foregroundStyle(.orange)

                    Button("Accept") {
                        viewModel.acceptDoubleFromHuman()
                    }
                    .buttonStyle(.borderedProminent)
                    .tint(.green)

                    Button("Decline") {
                        viewModel.declineDoubleFromHuman()
                    }
                    .buttonStyle(.bordered)
                    .tint(.red)
                }
                .padding()
                .background(Color.orange.opacity(0.1))
                .clipShape(RoundedRectangle(cornerRadius: 8))
            }

            // Status
            HStack {
                Text(viewModel.statusLine)
                    .font(.headline)

                if viewModel.isThinking {
                    ProgressView()
                        .scaleEffect(0.8)
                }
            }

            // Commentary
            if let message = viewModel.message {
                Text("\"\(message)\"")
                    .font(.subheadline)
                    .foregroundStyle(.secondary)
                    .italic()
            }

            // Board and Stats
            HStack(alignment: .top, spacing: 16) {
                BigBoardView(viewModel: viewModel)
                    .frame(maxWidth: 400, maxHeight: 400)

                // Stats card
                if viewModel.gamesPlayed > 0 {
                    VStack(alignment: .leading, spacing: 8) {
                        Text("Games: \(viewModel.gamesPlayed)")
                            .font(.subheadline.bold())

                        Text("You: \(viewModel.humanWins)")
                            .font(.subheadline)
                            .foregroundStyle(.blue)

                        Text("AI: \(viewModel.aiWins)")
                            .font(.subheadline)
                            .foregroundStyle(.red)

                        Text("Draws: \(viewModel.draws)")
                            .font(.subheadline)
                            .foregroundStyle(.secondary)
                    }
                    .padding(12)
                    .background(Color.gray.opacity(0.1))
                    .clipShape(RoundedRectangle(cornerRadius: 8))
                    .overlay(
                        RoundedRectangle(cornerRadius: 8)
                            .stroke(Color.gray.opacity(0.3), lineWidth: 1)
                    )
                }
            }

            // Game over actions
            if viewModel.isGameOver {
                HStack(spacing: 16) {
                    Button("Play Again") {
                        viewModel.resetGame()
                    }
                    .buttonStyle(.borderedProminent)

                    Button("Change Side") {
                        showingSideSelect = true
                    }
                    .buttonStyle(.bordered)
                }
            }

            Spacer()
        }
        .padding()
        .sheet(isPresented: $showingSideSelect) {
            SideSelectView { side, difficulty in
                viewModel.newGame(humanPlays: side, difficulty: difficulty)
                showingSideSelect = false
            }
            .presentationDetents([.medium])
        }
    }
}

struct SideSelectView: View {
    let onSelect: (Player, Difficulty) -> Void
    @State private var difficulty: Difficulty = .hard

    var body: some View {
        VStack(spacing: 24) {
            Text("Choose Your Side")
                .font(.title2.bold())

            Text("X plays first")
                .foregroundStyle(.secondary)

            HStack(spacing: 20) {
                Button {
                    onSelect(.X, difficulty)
                } label: {
                    VStack {
                        Text("X")
                            .font(.system(size: 48, weight: .bold))
                        Text("Play First")
                            .font(.caption)
                    }
                    .frame(width: 100, height: 100)
                }
                .buttonStyle(.bordered)
                .tint(.blue)

                Button {
                    onSelect(.O, difficulty)
                } label: {
                    VStack {
                        Text("O")
                            .font(.system(size: 48, weight: .bold))
                        Text("Play Second")
                            .font(.caption)
                    }
                    .frame(width: 100, height: 100)
                }
                .buttonStyle(.bordered)
                .tint(.red)
            }

            Divider()
                .padding(.horizontal, 40)

            // Difficulty picker
            VStack(spacing: 8) {
                Text("Difficulty")
                    .font(.subheadline)
                    .foregroundStyle(.secondary)

                Picker("Difficulty", selection: $difficulty) {
                    Text("Easy").tag(Difficulty.easy)
                    Text("Medium").tag(Difficulty.medium)
                    Text("Hard").tag(Difficulty.hard)
                }
                .pickerStyle(.segmented)
                .frame(width: 220)
            }
        }
        .padding()
    }
}

#Preview {
    GameView()
}
