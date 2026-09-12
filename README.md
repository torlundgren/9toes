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
scripts/
  check-fixtures.mjs        Guards fixture parity across the two ports
.github/workflows/
  ci.yml                    Lint, types, tests, build, Swift engine
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
npm test             # vitest (watch); gated on check:fixtures
npm run test:coverage
npm run check:fixtures   # golden fixtures identical across both ports?
npm run sync:fixtures    # repair drift: src/game/fixtures -> swift/
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

SwiftPM resources must live inside the test target, so the fixtures are physically
duplicated into `swift/Tests/NineToesEngineTests/Fixtures/`. `src/game/fixtures/` is
canonical — author fixtures there, next to `golden.test.ts`.

A drifted copy is the one failure this design is vulnerable to: the two engines could
diverge while both suites stay green, because each is asserting against different
expectations. So the copies are checked, not trusted. `npm test` and
`npm run test:coverage` refuse to run until they match:

```sh
npm run check:fixtures   # compare; non-zero exit on drift (runs automatically via pretest)
npm run sync:fixtures    # copy src/game/fixtures -> swift/, then re-run `swift test`
```

The check covers contents, files missing from the Swift copy, and orphans left behind in
it. `swift test` has no equivalent hook, so editing fixtures while working only in Swift
skips the local gate — CI runs the same check on every pull request, so drift is caught
before merge either way.

## CI

`.github/workflows/ci.yml` runs on every pull request and every push to `main`:

| Job | Runs |
| --- | --- |
| **Web** | `check:fixtures`, `lint`, `typecheck`, `test:coverage` (thresholds enforced), `build` |
| **Swift engine** | `swift test` in a `swift:6.1` container |

Both jobs run on `ubuntu-latest`. The Swift engine target imports only Foundation, and
the SwiftUI app is not a declared SPM target, so the engine tests need no Apple
frameworks — verified on `aarch64-unknown-linux-gnu`. Keeping them on Linux avoids the
10× macOS runner billing multiplier, and this repo is public, so the self-hosted Mac mini
is off-limits: fork pull requests would execute arbitrary code on it.

A side benefit worth preserving: because CI compiles the engine on Linux, an accidental
`import UIKit` or other Apple-only dependency fails the build. That keeps the engine
portable for the server-side move validation in `docs/MVP_BACKEND_SPEC.md`.

Note that **nothing builds the SwiftUI app** — `NineToesApp` is not a declared target in
`Package.swift` and there is no committed Xcode project, so that code is not compiled by
`swift build` or by CI.

## Status

Single-player and pass-and-play are complete: AI with three difficulties, undo, replay,
match play, lifetime stats, light/dark themes, four board skins (basic, wood, metallic,
paper), and the doubling cube.

Multiplayer is **specified but unbuilt** — see `docs/MVP_BACKEND_SPEC.md` for the
server-authoritative async design (Postgres schema, Elo ratings, invites and
matchmaking, Sign in with Apple).
