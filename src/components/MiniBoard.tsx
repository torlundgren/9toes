type Cell = "X" | "O" | "";
type LocalState = {
  cells: Cell[];
  won?: "X" | "O";
};

type Props = {
  boards: LocalState[];
  activeBoard?: number;
};

/** A static, decorative representation of an in-progress ultimate tic-tac-toe game. */
export default function MiniBoard({ boards, activeBoard }: Props) {
  return (
    <div className="big-board" role="img" aria-label="A 9Toes game in progress">
      {boards.map((b, bi) => {
        const wonClass = b.won === "X" ? "won-x" : b.won === "O" ? "won-o" : "";
        const activeClass = activeBoard === bi ? "active" : "";
        return (
          <div key={bi} className={`cell-board ${wonClass} ${activeClass}`}>
            {b.cells.map((c, ci) => (
              <div
                key={ci}
                className={`mini-cell ${c === "X" ? "x" : c === "O" ? "o" : ""}`}
              >
                {b.won ? (b.won === "X" ? "X" : "O") : c}
              </div>
            ))}
          </div>
        );
      })}
    </div>
  );
}

/** Pre-composed sample state that reads as a real, interesting position. */
export const sampleGame: LocalState[] = [
  { cells: ["X", "O", "", "", "X", "", "O", "", "X"], won: "X" },
  { cells: ["", "X", "O", "X", "", "O", "", "", ""] },
  { cells: ["O", "", "X", "O", "X", "", "", "O", ""] },
  { cells: ["", "X", "", "O", "O", "O", "", "X", ""], won: "O" },
  { cells: ["X", "", "O", "", "X", "", "O", "", "X"], won: "X" },
  { cells: ["", "", "", "X", "O", "", "", "", ""] },
  { cells: ["X", "O", "", "", "", "", "O", "", "X"] },
  { cells: ["", "X", "O", "", "X", "", "O", "", ""] },
  { cells: ["O", "O", "O", "X", "X", "", "", "", ""], won: "O" },
];
