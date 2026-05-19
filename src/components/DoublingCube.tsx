import { useState } from "react";

const VALUES = [2, 4, 8, 16, 32, 64, 1] as const;

type Props = {
  large?: boolean;
};

export default function DoublingCube({ large = false }: Props) {
  const [idx, setIdx] = useState<number>(VALUES.length - 1); // start at 1
  const [spinning, setSpinning] = useState(false);

  function bump() {
    setSpinning(true);
    setTimeout(() => setSpinning(false), 220);
    setIdx((i) => (i + 1) % VALUES.length);
  }

  return (
    <button
      type="button"
      className={`cube ${large ? "cube-large" : ""}`}
      onClick={bump}
      aria-label={`Doubling cube, currently showing ${VALUES[idx]}. Click to advance.`}
    >
      <span
        className="cube-val"
        style={{ transform: spinning ? "rotate(360deg) scale(1.05)" : "none" }}
      >
        {VALUES[idx]}
      </span>
    </button>
  );
}
