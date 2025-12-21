import SwiftUI
import NineToesEngine

struct GameView: View {
    @State private var viewModel = GameViewModel()
    @State private var showingSideSelect = true
    @AppStorage("darkMode") private var darkMode = false

    public init() {}

    public var body: some View {
        GeometryReader { geometry in
            let isLandscape = geometry.size.width > geometry.size.height

            if isLandscape {
                // Landscape layout: board left, info right
                HStack(alignment: .center, spacing: 24) {
                    // Board on left
                    BigBoardView(viewModel: viewModel)
                        .aspectRatio(1, contentMode: .fit)
                        .frame(maxHeight: geometry.size.height - 40)

                    // Info panel on right
                    VStack(spacing: 16) {
                        Text("9Toes")
                            .font(.system(size: 36, weight: .bold))

                        Text(viewModel.statusLine)
                            .font(.title3)
                            .multilineTextAlignment(.center)

                        if viewModel.state.cubeValue > 1 {
                            cubeDisplayLarge
                        }

                        if let message = viewModel.message {
                            commentaryBubbleLarge(message)
                        }

                        if viewModel.pendingDoubleFromAI {
                            doubleOfferView
                        }

                        Spacer()

                        if viewModel.gamesPlayed > 0 {
                            statsCardLarge
                        }

                        if viewModel.isGameOver {
                            gameOverButtonsLarge
                        }

                        // Landscape control buttons
                        VStack(spacing: 12) {
                            HStack(spacing: 12) {
                                Button("Undo") {
                                    viewModel.undo()
                                }
                                .font(.title3)
                                .buttonStyle(.bordered)
                                .disabled(!viewModel.canUndo)
                                .fixedSize()

                                Button("Restart") {
                                    viewModel.restart()
                                }
                                .font(.title3)
                                .buttonStyle(.bordered)
                                .fixedSize()
                            }

                            HStack(spacing: 12) {
                                if viewModel.humanCanDouble {
                                    Button("Double") {
                                        viewModel.offerDoubleFromHuman()
                                    }
                                    .font(.title3)
                                    .buttonStyle(.borderedProminent)
                                    .tint(.orange)
                                    .fixedSize()
                                }

                                Button {
                                    darkMode.toggle()
                                } label: {
                                    Image(systemName: darkMode ? "sun.max.fill" : "moon.fill")
                                        .font(.title2)
                                        .foregroundStyle(darkMode ? .yellow : .indigo)
                                }
                                .buttonStyle(.bordered)
                            }
                        }
                    }
                    .frame(minWidth: 200)
                }
                .padding()
            } else {
                // Portrait layout: vertical stack
                VStack(spacing: 16) {
                    Text("9Toes")
                        .font(.largeTitle.bold())

                    if viewModel.state.cubeValue > 1 {
                        cubeDisplay
                    }

                    if viewModel.pendingDoubleFromAI {
                        doubleOfferView
                    }

                    HStack {
                        Text(viewModel.statusLine)
                            .font(.headline)
                        if viewModel.isThinking {
                            ProgressView()
                                .scaleEffect(0.8)
                        }
                    }

                    if let message = viewModel.message {
                        commentaryBubble(message)
                    }

                    BigBoardView(viewModel: viewModel)
                        .aspectRatio(1, contentMode: .fit)
                        .frame(maxWidth: 400, maxHeight: 400)

                    if viewModel.gamesPlayed > 0 {
                        statsCard
                    }

                    if viewModel.isGameOver {
                        gameOverButtons
                    }

                    Spacer()

                    controlButtons
                }
                .padding()
            }
        }
        .padding()
        .preferredColorScheme(darkMode ? .dark : .light)
        .sheet(isPresented: $showingSideSelect) {
            SideSelectView { side, difficulty in
                viewModel.newGame(humanPlays: side, difficulty: difficulty)
                showingSideSelect = false
            }
            .presentationDetents([.medium])
        }
    }

    // MARK: - Extracted Views

    private var cubeDisplay: some View {
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

    private var cubeDisplayLarge: some View {
        HStack(spacing: 6) {
            Text("Cube:")
                .font(.title3)
                .foregroundStyle(.secondary)
            Text("\(viewModel.state.cubeValue)")
                .font(.title2.bold())
                .foregroundStyle(.orange)
            if let owner = viewModel.state.cubeOwner {
                Text("(\(owner.rawValue))")
                    .font(.headline)
                    .foregroundStyle(.secondary)
            }
        }
    }

    private var doubleOfferView: some View {
        VStack(spacing: 8) {
            Text("AI doubles to \(viewModel.state.cubeValue * 2)!")
                .font(.subheadline.bold())
                .foregroundStyle(.orange)

            HStack(spacing: 8) {
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
        }
        .padding()
        .background(Color.orange.opacity(0.1))
        .clipShape(RoundedRectangle(cornerRadius: 8))
    }

    private func commentaryBubble(_ message: String) -> some View {
        HStack {
            Spacer()
            Text(message)
                .font(.caption)
                .italic()
                .padding(.horizontal, 10)
                .padding(.vertical, 6)
                .background(Color.blue.opacity(0.15))
                .foregroundStyle(.primary)
                .clipShape(RoundedRectangle(cornerRadius: 12))
            Text("🤖")
                .font(.body)
        }
    }

    private func commentaryBubbleLarge(_ message: String) -> some View {
        HStack {
            Text(message)
                .font(.headline)
                .italic()
                .padding(.horizontal, 14)
                .padding(.vertical, 10)
                .background(Color.blue.opacity(0.15))
                .foregroundStyle(.primary)
                .clipShape(RoundedRectangle(cornerRadius: 14))
            Text("🤖")
                .font(.title2)
        }
    }

    private var statsCard: some View {
        HStack(spacing: 16) {
            Text("Games: \(viewModel.gamesPlayed)")
                .font(.caption.bold())

            Text("You: \(viewModel.humanWins)")
                .font(.caption)
                .foregroundStyle(.blue)

            Text("AI: \(viewModel.aiWins)")
                .font(.caption)
                .foregroundStyle(.red)

            Text("Draws: \(viewModel.draws)")
                .font(.caption)
                .foregroundStyle(.secondary)
        }
        .padding(.horizontal, 12)
        .padding(.vertical, 6)
        .background(Color.gray.opacity(0.1))
        .clipShape(RoundedRectangle(cornerRadius: 8))
    }

    private var statsCardLarge: some View {
        VStack(spacing: 8) {
            Text("Games: \(viewModel.gamesPlayed)")
                .font(.headline.bold())

            HStack(spacing: 20) {
                Text("You: \(viewModel.humanWins)")
                    .font(.headline)
                    .foregroundStyle(.blue)

                Text("AI: \(viewModel.aiWins)")
                    .font(.headline)
                    .foregroundStyle(.red)
            }

            Text("Draws: \(viewModel.draws)")
                .font(.subheadline)
                .foregroundStyle(.secondary)
        }
        .padding(.horizontal, 16)
        .padding(.vertical, 12)
        .background(Color.gray.opacity(0.1))
        .clipShape(RoundedRectangle(cornerRadius: 10))
    }

    private var gameOverButtons: some View {
        VStack(spacing: 8) {
            Button("Play Again") {
                viewModel.resetGame()
            }
            .buttonStyle(.borderedProminent)
            .fixedSize()

            Button("Change Side") {
                showingSideSelect = true
            }
            .buttonStyle(.bordered)
            .fixedSize()
        }
    }

    private var gameOverButtonsLarge: some View {
        VStack(spacing: 12) {
            Button("Play Again") {
                viewModel.resetGame()
            }
            .font(.title3)
            .buttonStyle(.borderedProminent)
            .fixedSize()

            Button("Change Side") {
                showingSideSelect = true
            }
            .font(.title3)
            .buttonStyle(.bordered)
            .fixedSize()
        }
    }

    private var controlButtons: some View {
        HStack(spacing: 8) {
            Button("Undo") {
                viewModel.undo()
            }
            .buttonStyle(.bordered)
            .disabled(!viewModel.canUndo)
            .fixedSize()

            Button("Restart") {
                viewModel.restart()
            }
            .buttonStyle(.bordered)
            .fixedSize()

            if viewModel.humanCanDouble {
                Button("Double") {
                    viewModel.offerDoubleFromHuman()
                }
                .buttonStyle(.borderedProminent)
                .tint(.orange)
                .fixedSize()
            }

            Spacer()

            Button {
                darkMode.toggle()
            } label: {
                Image(systemName: darkMode ? "sun.max.fill" : "moon.fill")
                    .foregroundStyle(darkMode ? .yellow : .indigo)
            }
            .buttonStyle(.bordered)
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
