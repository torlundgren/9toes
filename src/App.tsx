import React, { useEffect, useMemo, useState } from "react";
import "./App.css";
import {
  canDouble,
  type GameState,
  getWinningLineIndex,
  initialState,
  isLegalMove,
  other,
} from "./game/engine";
import { pickMove, shouldAcceptDouble, shouldDouble } from "./game/ai";
import { acceptDouble, applyMove, declineDouble, offerDouble } from "./game/state";

// History stores snapshots of game state before each move
type HistoryEntry = GameState;

type Stats = {
  games: number;
  xWins: number;
  oWins: number;
  draws: number;
  xPoints: number;
  oPoints: number;
};

const STATS_KEY = "9toes-stats";
const THEME_KEY = "9toes-theme";

type Theme = "light" | "dark";

function loadTheme(): Theme {
  try {
    const saved = localStorage.getItem(THEME_KEY);
    if (saved === "light" || saved === "dark") return saved;
  } catch {
    // Ignore
  }
  return "dark";
}

function saveTheme(theme: Theme) {
  try {
    localStorage.setItem(THEME_KEY, theme);
  } catch {
    // Ignore
  }
}

function loadStats(): Stats {
  try {
    const saved = localStorage.getItem(STATS_KEY);
    if (saved) {
      const parsed = JSON.parse(saved);
      // Migrate old stats without points
      return {
        games: parsed.games ?? 0,
        xWins: parsed.xWins ?? 0,
        oWins: parsed.oWins ?? 0,
        draws: parsed.draws ?? 0,
        xPoints: parsed.xPoints ?? 0,
        oPoints: parsed.oPoints ?? 0,
      };
    }
  } catch {
    // Ignore localStorage read errors.
  }
  return { games: 0, xWins: 0, oWins: 0, draws: 0, xPoints: 0, oPoints: 0 };
}

function saveStats(stats: Stats) {
  try {
    localStorage.setItem(STATS_KEY, JSON.stringify(stats));
  } catch {
    // Ignore localStorage write errors.
  }
}

export default function App() {
  const [state, setState] = useState<GameState>(() => initialState());
  const [history, setHistory] = useState<HistoryEntry[]>([]);
  const [vsAI, setVsAI] = useState(true);
  const [useCube, setUseCube] = useState(false);
  const [aiThinking, setAiThinking] = useState(false);
  const [stats, setStats] = useState<Stats>(loadStats);
  const [gameRecorded, setGameRecorded] = useState(false);
  const [showVictory, setShowVictory] = useState(true);
  const [replayIndex, setReplayIndex] = useState<number | null>(null);
  const [autoPlay, setAutoPlay] = useState(false);
  const [theme, setTheme] = useState<Theme>(loadTheme);

  // Apply theme to document
  useEffect(() => {
    document.documentElement.setAttribute("data-theme", theme);
    saveTheme(theme);
  }, [theme]);

  function toggleTheme() {
    setTheme((t) => (t === "dark" ? "light" : "dark"));
  }

  // Board to display (either current state or replay state)
  const displayState = useMemo(() => {
    if (replayIndex === null) return state;
    if (replayIndex >= history.length) return state;
    return history[replayIndex];
  }, [state, history, replayIndex]);

  const isReplaying = replayIndex !== null;

  // Auto-play effect for replay
  useEffect(() => {
    if (!autoPlay || !isReplaying) return;
    if (replayIndex === history.length) {
      setAutoPlay(false);
      return;
    }

    const timer = setInterval(() => {
      setReplayIndex((i) => {
        const next = (i ?? 0) + 1;
        if (next >= history.length) {
          setAutoPlay(false);
          return history.length;
        }
        return next;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [autoPlay, isReplaying, replayIndex, history.length]);

  // Record game result when it ends
  useEffect(() => {
    if (!state.result || gameRecorded) return;

    const points = useCube ? state.cubeValue : 1;
    setStats((prev) => {
      const next = {
        games: prev.games + 1,
        xWins: prev.xWins + (state.result === "X" ? 1 : 0),
        oWins: prev.oWins + (state.result === "O" ? 1 : 0),
        draws: prev.draws + (state.result === "D" ? 1 : 0),
        xPoints: prev.xPoints + (state.result === "X" ? points : 0),
        oPoints: prev.oPoints + (state.result === "O" ? points : 0),
      };
      saveStats(next);
      return next;
    });
    setGameRecorded(true);
  }, [state.result, gameRecorded, state.cubeValue, useCube]);

  const status = useMemo(() => {
    if (isReplaying) {
      return `Replay: Move ${replayIndex} of ${history.length}`;
    }
    if (state.result === "X" || state.result === "O") return `${state.result} wins!`;
    if (state.result === "D") return `Draw.`;
    if (state.pendingDouble) {
      const responder = other(state.pendingDouble);
      return `${state.pendingDouble} doubles! ${responder} to respond...`;
    }
    if (aiThinking) return "AI thinking...";
    const forced = state.nextBoard === null ? "Any board" : `Board ${state.nextBoard + 1}`;
    return `${state.turn} to move • ${forced}`;
  }, [state.result, state.turn, state.nextBoard, state.pendingDouble, aiThinking, isReplaying, replayIndex, history.length]);

  function cellClickable(bi: number, ci: number): boolean {
    // Block clicks during AI turn
    if (vsAI && state.turn === "O" && !state.result) return false;
    // Block clicks when there's a pending double
    if (state.pendingDouble) return false;
    return isLegalMove(state, { bi, ci });
  }

  function pushHistory(prev: GameState) {
    setHistory((h) => [...h, { ...prev, boards: prev.boards.map(b => [...b]), local: [...prev.local] }]);
  }

  function handleMove(bi: number, ci: number) {
    if (!cellClickable(bi, ci)) return;

    setState((prev) => {
      pushHistory(prev);
      return applyMove(prev, { bi, ci });
    });
  }

  function handleDouble() {
    if (!useCube || !canDouble(state)) return;
    setState((prev) => offerDouble(prev));
  }

  function handleAcceptDouble() {
    if (!state.pendingDouble) return;
    setState((prev) => acceptDouble(prev));
  }

  function handleDeclineDouble() {
    if (!state.pendingDouble) return;
    setState((prev) => declineDouble(prev));
  }

  function restart() {
    setState(initialState());
    setHistory([]);
    setGameRecorded(false);
    setShowVictory(true);
    setReplayIndex(null);
    setAutoPlay(false);
  }

  function startReplay() {
    setShowVictory(false);
    setReplayIndex(0);
    setAutoPlay(false);
  }

  function exitReplay() {
    setReplayIndex(null);
    setAutoPlay(false);
  }

  function undo() {
    setHistory((h) => {
      if (h.length === 0) return h;
      // In AI mode, undo both AI and human move
      const steps = vsAI && h.length >= 2 ? 2 : 1;
      const target = h[h.length - steps];
      setState({ ...target, boards: target.boards.map(b => [...b]), local: [...target.local] });
      return h.slice(0, -steps);
    });
  }

  // AI move effect
  useEffect(() => {
    if (!vsAI) return;
    if (state.result) return;

    // AI responds to player's double
    if (state.pendingDouble === "X") {
      setAiThinking(true);
      const timer = setTimeout(() => {
        if (shouldAcceptDouble(state)) {
          setState((prev) => acceptDouble(prev));
        } else {
          setState((prev) => declineDouble(prev));
        }
        setAiThinking(false);
      }, 600 + Math.random() * 400);
      return () => clearTimeout(timer);
    }

    // AI's turn to move (or potentially double)
    if (state.turn !== "O") return;

    setAiThinking(true);

    // Small delay to feel more natural
    const timer = setTimeout(() => {
      // Consider doubling first (if cube enabled and AI can double)
      if (useCube && shouldDouble(state)) {
        setState((prev) => offerDouble(prev));
        setAiThinking(false);
        return;
      }

      const move = pickMove(state);
      if (move) {
        setState((prev) => {
          pushHistory(prev);
          return applyMove(prev, move);
        });
      }
      setAiThinking(false);
    }, 400 + Math.random() * 300);

    return () => clearTimeout(timer);
  }, [vsAI, state, useCube]);

  // Compute winLines for display (UI-only concern)
  const getWinLine = (bi: number): number | null => {
    const decided = displayState.local[bi];
    if (decided === "X" || decided === "O") {
      return getWinningLineIndex(displayState.boards[bi]);
    }
    return null;
  };

  return (
    <div className="page">
      <header className="top">
        <div className="topLeft">
          <div className="title">9Toes</div>
          <div className="status">{status}</div>
        </div>
        <div className="topRight">
          <button
            className={`btn btnToggle ${vsAI ? "btnActive" : ""}`}
            onClick={() => setVsAI((v) => !v)}
          >
            vs AI
          </button>
          <button
            className={`btn btnToggle ${useCube ? "btnActive" : ""}`}
            onClick={() => setUseCube((v) => !v)}
          >
            Cube
          </button>
          <button className="btn" onClick={undo} disabled={history.length === 0 || aiThinking}>
            Undo
          </button>
          <button className="btn" onClick={restart}>
            Restart
          </button>
        </div>
      </header>

      <div className="statsBar">
        <span className="statItem">Games: {stats.games}</span>
        <span className="statItem statX">X: {stats.xWins}{useCube && ` (${stats.xPoints}pts)`}</span>
        <span className="statItem statO">O: {stats.oWins}{useCube && ` (${stats.oPoints}pts)`}</span>
        <span className="statItem">Draws: {stats.draws}</span>
      </div>

      <main className="boardWrap" aria-label="Ultimate Tic-Tac-Toe Board">
        <div className="bigGrid">
          {displayState.boards.map((board, bi) => {
            const playable = !isReplaying && !state.result && isLegalMove(state, { bi, ci: board.findIndex(c => c === null) >= 0 ? board.findIndex(c => c === null) : 0 }) && (state.nextBoard === null || state.nextBoard === bi);
            const decided = displayState.local[bi];
            const winLine = getWinLine(bi);
            const cls = [
              "smallBoard",
              !isReplaying && !state.result && state.local[bi] === null && (state.nextBoard === null || state.nextBoard === bi) ? "playable" : "dim",
              decided ? "decided" : "",
            ].join(" ");

            return (
              <div key={bi} className={cls} role="group" aria-label={`Local board ${bi + 1}`}>
                <div className="boardLabel">{bi + 1}</div>
                <div className="smallGrid">
                  {board.map((cell, ci) => {
                    const click = () => handleMove(bi, ci);
                    const isClick = !isReplaying && cellClickable(bi, ci);
                    return (
                      <button
                        key={ci}
                        className={`cell ${isClick ? "cellActive" : ""}`}
                        onClick={click}
                        disabled={!isClick || isReplaying}
                        aria-label={`Board ${bi + 1}, cell ${ci + 1}`}
                      >
                        {cell ?? ""}
                      </button>
                    );
                  })}
                </div>

                {decided && (
                  <div className={`overlay overlay${decided}`} aria-label="Local board result">
                    {winLine !== null && (
                      <div className={`winLine winLine${winLine}`} />
                    )}
                    <div className="overlayMark">{decided === "D" ? "–" : decided}</div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </main>

      {/* Doubling cube */}
      {useCube && !isReplaying && (
        <div className="cubeArea">
          <div className={`cube ${state.cubeOwner ? `cube${state.cubeOwner}` : "cubeCentered"}`}>
            <span className="cubeValue">{state.cubeValue}</span>
            {state.cubeOwner && <span className="cubeOwner">{state.cubeOwner}</span>}
          </div>
          {/* Double button for human player */}
          {!state.result && !state.pendingDouble && state.turn === "X" && canDouble(state) && (
            <button className="btn cubeBtn" onClick={handleDouble}>
              Double to {state.cubeValue * 2}
            </button>
          )}
        </div>
      )}

      {/* Pending double - human must respond */}
      {state.pendingDouble && (vsAI ? state.pendingDouble === "O" : true) && (
        <div className="doubleOverlay">
          <div className="doubleDialog">
            <div className={`doubleTitle doubleTitle${state.pendingDouble}`}>
              {state.pendingDouble} doubles to {state.cubeValue * 2}!
            </div>
            <div className="doubleButtons">
              <button className="btn doubleBtn doubleBtnAccept" onClick={handleAcceptDouble}>
                Accept
              </button>
              <button className="btn doubleBtn doubleBtnDecline" onClick={handleDeclineDouble}>
                Decline ({state.pendingDouble} wins {state.cubeValue})
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Victory overlay */}
      {(state.result === "X" || state.result === "O") && showVictory && (
        <div className="victoryOverlay">
          <div className="confetti">
            {Array.from({ length: 50 }).map((_, i) => (
              <div key={i} className="confettiPiece" style={{
                left: `${(i * 17 + 7) % 100}%`,
                animationDelay: `${(i * 0.06) % 3}s`,
                animationDuration: `${2 + (i % 5) * 0.4}s`,
                backgroundColor: ['#ef4444', '#3b82f6', '#22c55e', '#eab308', '#a855f7', '#ec4899'][i % 6],
              }} />
            ))}
          </div>
          <div className={`victoryText victory${state.result}`}>
            {state.result} wins{useCube && state.cubeValue > 1 ? ` (${state.cubeValue} pts)` : ""}!
          </div>
          <div className="victoryButtons">
            <button className="btn victoryBtn" onClick={() => setShowVictory(false)}>
              View Board
            </button>
            <button className="btn victoryBtn" onClick={startReplay}>
              Replay
            </button>
            <button className="btn victoryBtn victoryBtnPrimary" onClick={restart}>
              Play Again
            </button>
          </div>
        </div>
      )}

      {/* Replay controls */}
      {isReplaying && (
        <div className="replayControls">
          <button
            className="btn"
            onClick={() => { setAutoPlay(false); setReplayIndex(0); }}
            disabled={replayIndex === 0}
          >
            ⏮
          </button>
          <button
            className="btn"
            onClick={() => { setAutoPlay(false); setReplayIndex((i) => Math.max(0, (i ?? 0) - 1)); }}
            disabled={replayIndex === 0}
          >
            ◀
          </button>
          <button
            className={`btn replayAuto ${autoPlay ? "btnActive" : ""}`}
            onClick={() => setAutoPlay((a) => !a)}
            disabled={replayIndex === history.length}
          >
            {autoPlay ? "⏸" : "▶️"}
          </button>
          <button
            className="btn"
            onClick={() => { setAutoPlay(false); setReplayIndex((i) => Math.min(history.length, (i ?? 0) + 1)); }}
            disabled={replayIndex === history.length}
          >
            ▶
          </button>
          <button
            className="btn"
            onClick={() => { setAutoPlay(false); setReplayIndex(history.length); }}
            disabled={replayIndex === history.length}
          >
            ⏭
          </button>
          <span className="replayStatus">
            {replayIndex} / {history.length}
          </span>
          <button className="btn replayExit" onClick={exitReplay}>
            Exit
          </button>
        </div>
      )}

      {/* Theme toggle */}
      <button
        className="themeToggle"
        onClick={toggleTheme}
        aria-label={`Switch to ${theme === "dark" ? "light" : "dark"} mode`}
      >
        {theme === "dark" ? "☀️" : "🌙"}
      </button>
    </div>
  );
}
