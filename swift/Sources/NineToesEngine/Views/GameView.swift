import SwiftUI

public struct GameView: View {
    @State private var viewModel = GameViewModel()
    @State private var showingSideSelect = true

    public init() {}

    public var body: some View {
        VStack(spacing: 20) {
            // Header
            Text("9Toes")
                .font(.largeTitle.bold())

            // Status
            HStack {
                Text(viewModel.currentPlayerName)
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

            // Board
            BigBoardView(viewModel: viewModel)
                .frame(maxWidth: 400, maxHeight: 400)

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
            SideSelectView { side in
                viewModel.newGame(humanPlays: side)
                showingSideSelect = false
            }
            .presentationDetents([.medium])
        }
    }
}

struct SideSelectView: View {
    let onSelect: (Player) -> Void

    var body: some View {
        VStack(spacing: 24) {
            Text("Choose Your Side")
                .font(.title2.bold())

            Text("X plays first")
                .foregroundStyle(.secondary)

            HStack(spacing: 20) {
                Button {
                    onSelect(.X)
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
                    onSelect(.O)
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
        }
        .padding()
    }
}

#Preview {
    GameView()
}
