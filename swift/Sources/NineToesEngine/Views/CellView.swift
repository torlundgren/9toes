import SwiftUI

public struct CellView: View {
    let cell: Cell
    let isPlayable: Bool
    let onTap: () -> Void

    public init(cell: Cell, isPlayable: Bool, onTap: @escaping () -> Void) {
        self.cell = cell
        self.isPlayable = isPlayable
        self.onTap = onTap
    }

    public var body: some View {
        Button(action: onTap) {
            ZStack {
                Rectangle()
                    .fill(isPlayable ? Color.blue.opacity(0.1) : Color.clear)

                if let player = cell {
                    Text(player.rawValue)
                        .font(.system(size: 24, weight: .bold, design: .rounded))
                        .foregroundStyle(player == .X ? .blue : .red)
                }
            }
        }
        .buttonStyle(.plain)
        .aspectRatio(1, contentMode: .fit)
    }
}
