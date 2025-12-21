import SwiftUI
import NineToesEngine

struct LocalBoardView: View {
    let boardIndex: Int
    let cells: [Cell]
    let result: LocalResult
    let isActive: Bool
    let isCellPlayable: (Int) -> Bool
    let onCellTap: (Int) -> Void

    public init(
        boardIndex: Int,
        cells: [Cell],
        result: LocalResult,
        isActive: Bool,
        isCellPlayable: @escaping (Int) -> Bool,
        onCellTap: @escaping (Int) -> Void
    ) {
        self.boardIndex = boardIndex
        self.cells = cells
        self.result = result
        self.isActive = isActive
        self.isCellPlayable = isCellPlayable
        self.onCellTap = onCellTap
    }

    public var body: some View {
        ZStack(alignment: .topLeading) {
            // Cell grid
            Grid(horizontalSpacing: 1, verticalSpacing: 1) {
                ForEach(0..<3, id: \.self) { row in
                    GridRow {
                        ForEach(0..<3, id: \.self) { col in
                            let ci = row * 3 + col
                            CellView(
                                cell: cells[ci],
                                isPlayable: isCellPlayable(ci),
                                onTap: { onCellTap(ci) }
                            )
                        }
                    }
                }
            }
            .opacity(result == .undecided ? 1.0 : 0.3)

            // Won/Draw overlay
            if result != .undecided {
                ZStack {
                    RoundedRectangle(cornerRadius: 8)
                        .fill(overlayColor.opacity(0.9))

                    Text(overlayText)
                        .font(.system(size: 36, weight: .bold, design: .rounded))
                        .foregroundStyle(.white)
                }
            }

            // Board number
            Text("\(boardIndex + 1)")
                .font(.system(size: 12, weight: .medium))
                .foregroundStyle(Color.gray.opacity(0.5))
                .padding(6)
        }
        .padding(4)
        .background(Color(white: 0.92))
        .clipShape(RoundedRectangle(cornerRadius: 8))
        .overlay(
            RoundedRectangle(cornerRadius: 8)
                .stroke(isActive ? Color.blue.opacity(0.6) : Color.gray.opacity(0.3), lineWidth: isActive ? 2 : 1)
        )
    }

    private var overlayColor: Color {
        switch result {
        case .player(.X): return .blue
        case .player(.O): return .red
        case .draw: return .gray
        case .undecided: return .clear
        }
    }

    private var overlayText: String {
        switch result {
        case .player(let p): return p.rawValue
        case .draw: return "="
        case .undecided: return ""
        }
    }
}
