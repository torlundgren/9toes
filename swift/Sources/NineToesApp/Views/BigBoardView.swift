import SwiftUI
import NineToesEngine

struct BigBoardView: View {
    @Bindable var viewModel: GameViewModel

    public init(viewModel: GameViewModel) {
        self.viewModel = viewModel
    }

    public var body: some View {
        Grid(horizontalSpacing: 2, verticalSpacing: 2) {
            ForEach(0..<3, id: \.self) { row in
                GridRow {
                    ForEach(0..<3, id: \.self) { col in
                        let bi = row * 3 + col
                        LocalBoardView(
                            boardIndex: bi,
                            cells: viewModel.state.boards[bi],
                            result: viewModel.state.local[bi],
                            isActive: viewModel.isBoardPlayable(bi),
                            isCellPlayable: { ci in
                                viewModel.isCellPlayable(boardIndex: bi, cellIndex: ci)
                            },
                            onCellTap: { ci in
                                viewModel.cellTapped(boardIndex: bi, cellIndex: ci)
                            }
                        )
                    }
                }
            }
        }
        .padding(4)
        .background(Color.gray.opacity(0.4))
        .clipShape(RoundedRectangle(cornerRadius: 12))
        .overlay(
            RoundedRectangle(cornerRadius: 12)
                .stroke(Color.gray.opacity(0.5), lineWidth: 1)
        )
    }
}
