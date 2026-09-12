export type Cell = "X" | "O" | "";

export type LocalState = {
  cells: Cell[];
  won?: "X" | "O";
};

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
