# 9Toes

**Ultimate tic-tac-toe with a doubling cube.** Nine boards, recursive strategy, and
stakes borrowed from backgammon. Playable in the browser, with a SwiftUI port for iOS
and macOS sharing the same engine behavior.

Live site: [9toes.app](https://9toes.app/)

## The game

The board is a 3×3 grid of 3×3 boards. Win a small board to claim its square on the
big board.

The twist: **your move dictates your opponent's next board.** Play the centre cell of
any board and your opponent must play in the centre board. If that board is already
decided, they may play anywhere.

Two win conditions are implemented as selectable variants:

| Variant | Win condition |
| --- | --- |
| **Classic** | Three claimed boards in a row on the big grid |
| **Tic-Tac-Ku** | First to claim any five of the nine boards |

### The doubling cube

Optional, off by default. Either player may offer to double the stakes before moving;
the opponent accepts (cube value doubles, opponent takes ownership and may redouble
later) or declines (conceding the current stake). The AI has its own
`shouldDouble` / `shouldAcceptDouble` heuristics. It matters most in match play —
first to 7 points — where a well-timed double wins a match that straight game counting
would lose.

## Layout

```
src/
  game/          Engine — pure, UI-free, fully tested
    engine.ts      Types, rules, legal moves, win detection
    state.ts       Immutable move/cube transitions
    ai.ts          Move scoring, difficulty, cube decisions, commentary
    fixtures/      Shared golden fixtures (see Testing)
  components/    MiniBoard (decorative), DoublingCube
  pages/         Landing, Privacy, Support
  App.tsx        The playable game
swift/
  Sources/NineToesEngine/   Swift port of the same engine
  Sources/NineToesApp/      SwiftUI app
  Tests/                    Mirrors the TS golden tests
docs/
  MVP_BACKEND_SPEC.md        Multiplayer design (not yet built)
```

Routes: `/` landing · `/play` the game · `/privacy` · `/support`

Game state lives in `App.tsx`; theme, board skin, and lifetime stats persist to
`localStorage`. There is no backend — every game so far is local, against the AI or
pass-and-play.

## Develop

```sh
npm install
npm run dev          # Vite dev server
npm run build        # tsc -b && vite build
npm run lint
npm run typecheck
npm test             # vitest (watch)
npm run test:coverage
```

Swift engine and app:

```sh
cd swift
swift test           # 31 tests
swift build
```

## Testing

The engine carries the behavior worth protecting, so it gets the tests: **52 TS tests**
and **31 Swift tests**.

The interesting part is `src/game/fixtures/` — JSON fixtures describing a board state,
a move, and the expected outcome. Both test suites load the *same* fixtures, which is
what keeps the TypeScript and Swift engines behaviorally identical rather than merely
similar. They cover rule invariants (forced board, fall-through to free choice, win
detection), AI sanity (never miss an immediate win or block), and exact scoring
snapshots.

Fixtures are currently **duplicated by hand** into
`swift/Tests/NineToesEngineTests/Fixtures/`. Keep the two copies in sync when adding or
editing one — nothing enforces it yet:

```sh
diff -r src/game/fixtures swift/Tests/NineToesEngineTests/Fixtures
```

## Status

Single-player and pass-and-play are complete: AI with three difficulties, undo, replay,
match play, lifetime stats, light/dark themes, four board skins (basic, wood, metallic,
paper), and the doubling cube.

Multiplayer is **specified but unbuilt** — see `docs/MVP_BACKEND_SPEC.md` for the
server-authoritative async design (Postgres schema, Elo ratings, invites and
matchmaking, Sign in with Apple).
