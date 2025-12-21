import SwiftUI

public struct BigBoardView: View {
    @Bindable var viewModel: GameViewModel

    public init(viewModel: GameViewModel) {
        self.viewModel = viewModel
    }

    public var body: some View {
        Grid(horizontalSpacing: 4, verticalSpacing: 4) {
            ForEach(0..<3) { row in
                GridRow {
                    ForEach(0..<3) { col in
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
        .padding(8)
        .background(Color.black.opacity(0.8))
        .clipShape(RoundedRectangle(cornerRadius: 12))
    }
}
