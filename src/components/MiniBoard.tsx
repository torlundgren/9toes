import type { LocalState } from "./sampleGame";

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
