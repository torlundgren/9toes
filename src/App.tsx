import { useEffect, useMemo, useState } from "react";
import "./App.css";
import {
  canDouble,
  type Difficulty,
  type GameState,
  getWinningLineIndex,
  initialState,
  isLegalMove,
  other,
  type Player,
} from "./game/engine";
import { generateCommentary, pickMove, shouldAcceptDouble, shouldDouble } from "./game/ai";
import { acceptDouble, applyMove, declineDouble, offerDouble } from "./game/state";

// History stores snapshots of game state before each move
type HistoryEntry = GameState;

type Stats = {
  games: number;
  humanWins: number;
  aiWins: number;
  draws: number;
  humanPoints: number;
  aiPoints: number;
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
      // Migrate from old X/O format to Human/AI format
      if ('humanWins' in parsed) {
        return {
          games: parsed.games ?? 0,
          humanWins: parsed.humanWins ?? 0,
          aiWins: parsed.aiWins ?? 0,
          draws: parsed.draws ?? 0,
          humanPoints: parsed.humanPoints ?? 0,
          aiPoints: parsed.aiPoints ?? 0,
        };
      }
      // Old format - reset stats since we can't know who was human
      return { games: 0, humanWins: 0, aiWins: 0, draws: 0, humanPoints: 0, aiPoints: 0 };
    }
  } catch {
    // Ignore localStorage read errors.
  }
  return { games: 0, humanWins: 0, aiWins: 0, draws: 0, humanPoints: 0, aiPoints: 0 };
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
  const [sideChoice, setSideChoice] = useState<"X" | "O" | "R">("X");
  const [difficulty, setDifficulty] = useState<Difficulty>("medium");
  const [playerSide, setPlayerSide] = useState<Player | null>(null);
  const [aiThinking, setAiThinking] = useState(false);
  const [stats, setStats] = useState<Stats>(loadStats);
  const [gameRecorded, setGameRecorded] = useState(false);
  const [showVictory, setShowVictory] = useState(true);
  const [replayIndex, setReplayIndex] = useState<number | null>(null);
  const [autoPlay, setAutoPlay] = useState(false);
  const [theme, setTheme] = useState<Theme>(loadTheme);
  const [commentary, setCommentary] = useState<string | null>(null);
  const [lastAiMove, setLastAiMove] = useState<{ bi: number; ci: number } | null>(null);
  const [aiTargetBoard, setAiTargetBoard] = useState<number | null>(null);
  const [matchTarget, setMatchTarget] = useState<number | null>(null); // null = single game, 7 = first to 7
  const [matchScore, setMatchScore] = useState({ human: 0, ai: 0 });

  // Apply theme to document
  useEffect(() => {
    document.documentElement.setAttribute("data-theme", theme);
    saveTheme(theme);
  }, [theme]);

  // Auto-dismiss commentary after 3 seconds
  useEffect(() => {
    if (!commentary) return;
    const timer = setTimeout(() => setCommentary(null), 3000);
    return () => clearTimeout(timer);
  }, [commentary]);

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
  const hasStarted = history.length > 0;
  const aiSide = vsAI && playerSide ? (playerSide === "X" ? "O" : "X") : null;
  const needsSideSelect = vsAI && playerSide === null && !hasStarted && !isReplaying;

  // Auto-play effect for replay
  useEffect(() => {
    if (!autoPlay || !isReplaying) return;
    if (replayIndex === history.length) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
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
    if (!vsAI || !playerSide) return; // Only track vs AI games

    const points = useCube ? state.cubeValue : 1;
    const humanWon = state.result === playerSide;
    const aiWon = state.result === aiSide;
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setStats((prev) => {
      const next = {
        games: prev.games + 1,
        humanWins: prev.humanWins + (humanWon ? 1 : 0),
        aiWins: prev.aiWins + (aiWon ? 1 : 0),
        draws: prev.draws + (state.result === "D" ? 1 : 0),
        humanPoints: prev.humanPoints + (humanWon ? points : 0),
        aiPoints: prev.aiPoints + (aiWon ? points : 0),
      };
      saveStats(next);
      return next;
    });
    // Update match score
    if (matchTarget) {
      setMatchScore((prev) => ({
        human: prev.human + (humanWon ? points : 0),
        ai: prev.ai + (aiWon ? points : 0),
      }));
    }
    setGameRecorded(true);
  }, [state.result, gameRecorded, state.cubeValue, useCube, vsAI, playerSide, aiSide, matchTarget]);

  const status = useMemo(() => {
    if (isReplaying) {
      return `Replay: Move ${replayIndex} of ${history.length}`;
    }
    if (needsSideSelect) return "Choose a side to start.";
    if (state.result === "X" || state.result === "O") return `${state.result} wins!`;
    if (state.result === "D") return `Draw.`;
    if (state.pendingDouble) {
      const responder = other(state.pendingDouble);
      return `${state.pendingDouble} doubles! ${responder} to respond...`;
    }
    if (aiThinking) return "AI thinking...";
    const forced = state.nextBoard === null ? "Any board" : `Board ${state.nextBoard + 1}`;
    return `${state.turn} to move • ${forced}`;
  }, [state.result, state.turn, state.nextBoard, state.pendingDouble, aiThinking, isReplaying, replayIndex, history.length, needsSideSelect]);

  function cellClickable(bi: number, ci: number): boolean {
    if (needsSideSelect) return false;
    // Block clicks during AI turn
    if (aiSide && state.turn === aiSide && !state.result) return false;
    // Block clicks when there's a pending double
    if (state.pendingDouble) return false;
    return isLegalMove(state, { bi, ci });
  }

  function pushHistory(prev: GameState) {
    setHistory((h) => [...h, { ...prev, boards: prev.boards.map(b => [...b]), local: [...prev.local] }]);
  }

  function handleMove(bi: number, ci: number) {
    if (!cellClickable(bi, ci)) return;

    const move = { bi, ci };
    const prevState = state;
    const newState = applyMove(prevState, move);

    pushHistory(prevState);
    setState(newState);

    // Generate AI commentary on player's move (only in vs AI mode)
    if (vsAI && playerSide && prevState.turn === playerSide) {
      const comment = generateCommentary(prevState, newState, move);
      if (comment) {
        setCommentary(comment);
      }
    }
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
    setPlayerSide(null);
    setGameRecorded(false);
    setShowVictory(true);
    setReplayIndex(null);
    setAutoPlay(false);
    setAiThinking(false);
  }

  function startGame() {
    const chosen =
      sideChoice === "R" ? (Math.random() < 0.5 ? "X" : "O") : sideChoice;
    setPlayerSide(chosen);
    setState(initialState());
    setHistory([]);
    setGameRecorded(false);
    setShowVictory(true);
    setReplayIndex(null);
    setAutoPlay(false);
    setAiThinking(false);
    setMatchScore({ human: 0, ai: 0 }); // Reset match score
  }

  // Start next game in a match (keep same sides and settings)
  function nextMatchGame() {
    setState(initialState());
    setHistory([]);
    setGameRecorded(false);
    setShowVictory(true);
    setReplayIndex(null);
    setAutoPlay(false);
    setAiThinking(false);
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
    if (!aiSide) return;

    // AI responds to player's double
    if (playerSide && state.pendingDouble === playerSide) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
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
    if (state.turn !== aiSide) return;

    // If AI just doubled, wait for human to respond
    if (state.pendingDouble === aiSide) return;

    setAiThinking(true);

    // Small delay to feel more natural
    const timer = setTimeout(() => {
      // Consider doubling first (if cube enabled and AI can double)
      if (useCube && shouldDouble(state)) {
        setState((prev) => offerDouble(prev));
        setAiThinking(false);
        return;
      }

      const move = pickMove(state, difficulty);
      if (move) {
        // Step 1: Highlight the target board (like player sees)
        setAiTargetBoard(move.bi);

        // Step 2: After pause, make the move with cell animation
        setTimeout(() => {
          setLastAiMove({ bi: move.bi, ci: move.ci });
          setState((prev) => {
            pushHistory(prev);
            return applyMove(prev, move);
          });

          // Step 3: After another pause, clear and end turn
          setTimeout(() => {
            setAiTargetBoard(null);
            setLastAiMove(null);
            setAiThinking(false);
          }, 1000);
        }, 1000);
      } else {
        setAiThinking(false);
      }
    }, 200);

    return () => clearTimeout(timer);
  }, [vsAI, aiSide, playerSide, state, useCube, difficulty]);

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
          <button className="btn" onClick={undo} disabled={history.length === 0 || aiThinking}>
            Undo
          </button>
          <button className="btn" onClick={restart}>
            Restart
          </button>
        </div>
      </header>

      {matchTarget ? (
        <div className="statsBar matchBar">
          <span className="matchTitle">Match to {matchTarget}</span>
          <span className="statItem statHuman">You: {matchScore.human}</span>
          <span className="statItem statAI">AI: {matchScore.ai}</span>
        </div>
      ) : (
        <div className="statsBar">
          <span className="statItem">Games: {stats.games}</span>
          <span className="statItem statHuman">You: {stats.humanWins}{useCube && ` (${stats.humanPoints}pts)`}</span>
          <span className="statItem statAI">AI: {stats.aiWins}{useCube && ` (${stats.aiPoints}pts)`}</span>
          <span className="statItem">Draws: {stats.draws}</span>
        </div>
      )}

      {/* AI Commentary */}
      {commentary && (
        <div className="commentary" onClick={() => setCommentary(null)}>
          <span className="commentaryText">{commentary}</span>
        </div>
      )}

      {needsSideSelect ? (
        <section className="startPanel" aria-label="Choose side to start">
          <div className="startCard">
            <div className="startHeader">New Game</div>

            <div className="startSection">
              <div className="startSectionTitle">Play as</div>
              <div className="startOptions">
                <button
                  className={`optionCard ${sideChoice === "X" ? "selected" : ""}`}
                  onClick={() => setSideChoice("X")}
                >
                  <span className="optionIcon optionX">X</span>
                  <span className="optionLabel">First</span>
                </button>
                <button
                  className={`optionCard ${sideChoice === "O" ? "selected" : ""}`}
                  onClick={() => setSideChoice("O")}
                >
                  <span className="optionIcon optionO">O</span>
                  <span className="optionLabel">Second</span>
                </button>
                <button
                  className={`optionCard ${sideChoice === "R" ? "selected" : ""}`}
                  onClick={() => setSideChoice("R")}
                >
                  <span className="optionIcon">?</span>
                  <span className="optionLabel">Random</span>
                </button>
              </div>
            </div>

            <div className="startSection">
              <div className="startSectionTitle">Difficulty</div>
              <div className="startOptions">
                <button
                  className={`optionCard ${difficulty === "easy" ? "selected" : ""}`}
                  onClick={() => setDifficulty("easy")}
                >
                  <span className="optionEmoji">😊</span>
                  <span className="optionLabel">Easy</span>
                </button>
                <button
                  className={`optionCard ${difficulty === "medium" ? "selected" : ""}`}
                  onClick={() => setDifficulty("medium")}
                >
                  <span className="optionEmoji">🤔</span>
                  <span className="optionLabel">Medium</span>
                </button>
                <button
                  className={`optionCard ${difficulty === "hard" ? "selected" : ""}`}
                  onClick={() => setDifficulty("hard")}
                >
                  <span className="optionEmoji">😈</span>
                  <span className="optionLabel">Hard</span>
                </button>
              </div>
            </div>

            <div className="startSection">
              <div className="startSectionTitle">Mode</div>
              <div className="startOptions startOptions4">
                <button
                  className={`optionCard ${matchTarget === null ? "selected" : ""}`}
                  onClick={() => setMatchTarget(null)}
                >
                  <span className="optionEmoji">🎮</span>
                  <span className="optionLabel">Single</span>
                </button>
                <button
                  className={`optionCard ${matchTarget === 5 ? "selected" : ""}`}
                  onClick={() => setMatchTarget(5)}
                >
                  <span className="optionIcon">5</span>
                  <span className="optionLabel">First to 5</span>
                </button>
                <button
                  className={`optionCard ${matchTarget === 7 ? "selected" : ""}`}
                  onClick={() => setMatchTarget(7)}
                >
                  <span className="optionIcon">7</span>
                  <span className="optionLabel">First to 7</span>
                </button>
                <button
                  className={`optionCard ${matchTarget === 11 ? "selected" : ""}`}
                  onClick={() => setMatchTarget(11)}
                >
                  <span className="optionIcon">11</span>
                  <span className="optionLabel">First to 11</span>
                </button>
              </div>
            </div>

            <div className="startSection">
              <div className="startSectionTitle">Options</div>
              <button
                className={`optionToggle ${useCube ? "selected" : ""}`}
                onClick={() => setUseCube((v) => !v)}
              >
                <span className="optionToggleIcon">🎲</span>
                <span className="optionToggleText">
                  <span className="optionToggleLabel">Doubling Cube</span>
                  <span className="optionToggleDesc">Backgammon-style stakes</span>
                </span>
                <span className={`optionToggleCheck ${useCube ? "checked" : ""}`}>
                  {useCube ? "✓" : ""}
                </span>
              </button>
            </div>

            <button className="startCta" onClick={startGame}>
              {matchTarget ? `Start Match to ${matchTarget}` : "Start Game"}
            </button>
          </div>
        </section>
      ) : (
        <>
          <main className="boardWrap" aria-label="Ultimate Tic-Tac-Toe Board">
            <div className="bigGrid">
              {displayState.boards.map((board, bi) => {
            const decided = displayState.local[bi];
            const winLine = getWinLine(bi);
            const isPlayable = !aiThinking && !isReplaying && !state.result && state.local[bi] === null && (state.nextBoard === null || state.nextBoard === bi);
            const isAiTarget = aiTargetBoard === bi;
            const cls = [
                  "smallBoard",
                  (isPlayable || isAiTarget) ? "playable" : "dim",
                  decided ? "decided" : "",
                ].join(" ");

                return (
                  <div key={bi} className={cls} role="group" aria-label={`Local board ${bi + 1}`}>
                    <div className="boardLabel">{bi + 1}</div>
                    <div className="smallGrid">
                      {board.map((cell, ci) => {
                        const click = () => handleMove(bi, ci);
                        const isClick = !isReplaying && cellClickable(bi, ci);
                        const isLastAiMove = lastAiMove?.bi === bi && lastAiMove?.ci === ci;
                        const cellClass = [
                          "cell",
                          isClick ? "cellActive" : "",
                          cell === "X" ? "cellX" : "",
                          cell === "O" ? "cellO" : "",
                          isLastAiMove ? "cellHighlight" : "",
                        ].filter(Boolean).join(" ");
                        return (
                          <button
                            key={ci}
                            className={cellClass}
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
          {useCube && !isReplaying && (() => {
            // Determine cube position: player (bottom), opponent (top), or center (no owner)
            const cubePosition = state.cubeOwner === null
              ? "cubeCenter"
              : state.cubeOwner === playerSide
                ? "cubePlayer"
                : "cubeOpponent";
            return (
              <div className={`cubeArea ${cubePosition}`}>
                <div className={`cube ${state.cubeOwner ? `cube${state.cubeOwner}` : "cubeCentered"}`}>
                  <span className="cubeValue">{state.cubeValue}</span>
                  {state.cubeOwner && <span className="cubeOwner">{state.cubeOwner}</span>}
                </div>
                {/* Double button for human player */}
                {!state.result && !state.pendingDouble && canDouble(state) && (!vsAI || (playerSide && state.turn === playerSide)) && (
                  <button className="btn cubeBtn" onClick={handleDouble}>
                    Double to {state.cubeValue * 2}
                  </button>
                )}
              </div>
            );
          })()}

          {/* Pending double - human must respond */}
          {state.pendingDouble && (vsAI ? aiSide && state.pendingDouble === aiSide : true) && (
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
        </>
      )}

      {/* Victory overlay */}
      {(state.result === "X" || state.result === "O") && showVictory && (() => {
        const humanWon = vsAI && state.result === playerSide;
        const aiWon = vsAI && state.result === aiSide;
        const points = useCube ? state.cubeValue : 1;
        // Calculate match score including this game (only add if not yet recorded to avoid double-counting)
        const newHumanScore = matchScore.human + (gameRecorded ? 0 : (humanWon ? points : 0));
        const newAiScore = matchScore.ai + (gameRecorded ? 0 : (aiWon ? points : 0));
        const humanWonMatch = matchTarget && newHumanScore >= matchTarget;
        const aiWonMatch = matchTarget && newAiScore >= matchTarget;
        const matchWon = humanWonMatch || aiWonMatch;

        const winnerLabel = matchWon
          ? (humanWonMatch ? "You Win the Match!" : "AI Wins the Match!")
          : (humanWon ? "You Win!" : aiWon ? "AI Wins!" : `${state.result} Wins!`);

        return (
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
            {winnerLabel}
          </div>
          {matchTarget && (
            <div className="victoryMatchScore">
              Match Score: You {newHumanScore} – {newAiScore} AI (first to {matchTarget})
            </div>
          )}
          {useCube && state.cubeValue > 1 && (
            <div className="victoryExplain">
              The doubling cube was at {state.cubeValue}, so this game is worth {state.cubeValue} victory points.
            </div>
          )}
          <div className="victoryButtons">
            <button className="btn victoryBtn" onClick={() => setShowVictory(false)}>
              View Board
            </button>
            <button className="btn victoryBtn" onClick={startReplay}>
              Replay
            </button>
            {matchTarget && !matchWon ? (
              <button className="btn victoryBtn victoryBtnPrimary" onClick={nextMatchGame}>
                Next Game
              </button>
            ) : (
              <button className="btn victoryBtn victoryBtnPrimary" onClick={restart}>
                {matchTarget ? "New Match" : "Play Again"}
              </button>
            )}
          </div>
        </div>
        );
      })()}

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
