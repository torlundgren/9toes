# 9Toes Multiplayer MVP Spec

## Overview

Server-authoritative multiplayer for Ultimate Tic-Tac-Toe. Phase 1 targets async play with friends + rated matchmaking. No realtime WebSockets yet.

---

## Database Schema (Postgres)

```sql
-- Users (minimal, expand later)
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  apple_id TEXT UNIQUE,          -- Sign in with Apple subject
  handle TEXT UNIQUE NOT NULL,   -- display name, 3-20 chars
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Ratings (Elo, one row per user)
CREATE TABLE ratings (
  user_id UUID PRIMARY KEY REFERENCES users(id),
  rating INT DEFAULT 1200,       -- starting Elo
  games_played INT DEFAULT 0,
  wins INT DEFAULT 0,
  losses INT DEFAULT 0,
  draws INT DEFAULT 0,
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Games
CREATE TABLE games (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  player_x UUID NOT NULL REFERENCES users(id),
  player_o UUID REFERENCES users(id),  -- NULL until accepted (for invites)

  status TEXT NOT NULL DEFAULT 'pending',
  -- 'pending'     = waiting for opponent (invite)
  -- 'matching'    = in matchmaking queue
  -- 'active'      = game in progress
  -- 'finished'    = game over
  -- 'abandoned'   = player left / timed out

  turn TEXT NOT NULL DEFAULT 'X',      -- 'X' or 'O'
  next_board INT,                       -- 0-8, NULL = any board valid

  -- Denormalized current state (for fast queries)
  -- JSON arrays: local_boards[9] each with 9 cells, meta_board[9]
  board_state JSONB NOT NULL,

  winner TEXT,                -- 'X', 'O', 'draw', NULL
  is_rated BOOLEAN DEFAULT false,
  variant TEXT DEFAULT 'ultimate',  -- 'ultimate' or 'tictacku'

  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  finished_at TIMESTAMPTZ
);

-- Move log (append-only, source of truth)
CREATE TABLE moves (
  id BIGSERIAL PRIMARY KEY,
  game_id UUID NOT NULL REFERENCES games(id),
  move_no INT NOT NULL,           -- 1, 2, 3...
  player TEXT NOT NULL,           -- 'X' or 'O'
  board_idx INT NOT NULL,         -- 0-8
  cell_idx INT NOT NULL,          -- 0-8
  created_at TIMESTAMPTZ DEFAULT now(),

  UNIQUE(game_id, move_no)
);

-- Matchmaking queue
CREATE TABLE matchmaking_queue (
  user_id UUID PRIMARY KEY REFERENCES users(id),
  rating INT NOT NULL,            -- snapshot at enqueue time
  variant TEXT DEFAULT 'ultimate',
  enqueued_at TIMESTAMPTZ DEFAULT now()
);

-- Game invites (for friend play)
CREATE TABLE invites (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  game_id UUID NOT NULL REFERENCES games(id),
  code TEXT UNIQUE NOT NULL,      -- 6-char shareable code
  created_at TIMESTAMPTZ DEFAULT now(),
  expires_at TIMESTAMPTZ DEFAULT now() + INTERVAL '24 hours'
);

-- Indexes
CREATE INDEX idx_games_player_x ON games(player_x) WHERE status = 'active';
CREATE INDEX idx_games_player_o ON games(player_o) WHERE status = 'active';
CREATE INDEX idx_games_status ON games(status);
CREATE INDEX idx_matchmaking_enqueued ON matchmaking_queue(enqueued_at);
CREATE INDEX idx_moves_game ON moves(game_id);
```

### Board State JSON Structure

```json
{
  "localBoards": [
    ["X", "O", "", "", "X", "", "", "", ""],
    ["", "", "", "", "", "", "", "", ""],
    ...
  ],
  "metaBoard": ["X", "", "O", "", "", "", "", "", ""],
  "moveCount": 7
}
```

---

## API Endpoints

### Auth
```
POST /auth/apple    -- Sign in with Apple, returns JWT
```

### Games
```
POST   /games                -- Create game (invite or matchmaking)
GET    /games/:id            -- Get game state + move history
POST   /games/:id/moves      -- Submit a move
POST   /games/:id/resign     -- Resign the game
GET    /me/games             -- List my active games
```

### Invites
```
POST   /invites              -- Create invite code for a game
GET    /invites/:code        -- Get invite details
POST   /invites/:code/accept -- Join game via invite
```

### Matchmaking
```
POST   /matchmaking/join     -- Enter rated queue
DELETE /matchmaking/leave    -- Leave queue
GET    /matchmaking/status   -- Am I in queue? ETA?
```

### Leaderboard
```
GET    /leaderboard          -- Top 100 by rating
GET    /me/stats             -- My rating + record
```

---

## Move Submission Flow

### Request
```
POST /games/:id/moves
{
  "boardIdx": 4,
  "cellIdx": 0
}
```

### Server Validation (in order)

1. **Game exists and is active**
2. **Player is in this game**
3. **It's this player's turn**
4. **Board is valid:**
   - If `next_board` is set AND that board is not won/full → must play there
   - If `next_board` is NULL or that board is won/full → any unfinished board
5. **Cell is empty**
6. **Apply move, check for local board win**
7. **Check for meta board win / draw**
8. **Compute next_board** (or NULL if target board is finished)
9. **Update game state, append to moves table**
10. **If game over: update ratings (if rated), set winner**

### Response
```json
{
  "success": true,
  "game": { /* updated game state */ },
  "move": { "moveNo": 8, "boardIdx": 4, "cellIdx": 0 },
  "gameOver": false,
  "nextBoard": 0
}
```

### Error Response
```json
{
  "success": false,
  "error": "not_your_turn" | "invalid_board" | "cell_occupied" | "game_over"
}
```

---

## Win Detection

### Local Board Win
Standard tic-tac-toe lines:
```
[0,1,2], [3,4,5], [6,7,8],  // rows
[0,3,6], [1,4,7], [2,5,8],  // cols
[0,4,8], [2,4,6]            // diagonals
```

### Meta Board Win (Ultimate)
Same lines on the 9-cell meta board.

### Meta Board Win (Tic-Tac-Ku)
Same lines, but winning cell must match the cell position of the local board.
- Board 0 won by winning cell 0 of that board
- Board 4 (center) won by winning cell 4, etc.

### Draw Detection
- Local board: all 9 cells filled, no winner
- Meta board: all 9 boards decided (won or drawn), no meta winner

---

## Elo Rating System

Using standard Elo with K=32 for simplicity.

### Formula

```
Expected score:
E_a = 1 / (1 + 10^((R_b - R_a) / 400))

New rating:
R'_a = R_a + K * (S_a - E_a)

Where:
- R_a, R_b = current ratings
- S_a = actual score (1 = win, 0.5 = draw, 0 = loss)
- K = 32 (can tune later)
```

### Implementation

```typescript
function calculateElo(
  ratingA: number,
  ratingB: number,
  scoreA: number  // 1, 0.5, or 0
): { newRatingA: number; newRatingB: number } {
  const K = 32;

  const expectedA = 1 / (1 + Math.pow(10, (ratingB - ratingA) / 400));
  const expectedB = 1 - expectedA;

  const scoreB = 1 - scoreA;

  return {
    newRatingA: Math.round(ratingA + K * (scoreA - expectedA)),
    newRatingB: Math.round(ratingB + K * (scoreB - expectedB)),
  };
}
```

### Rating Floor
Minimum rating: 100 (prevents negative ratings)

### New Player Handling
- Start at 1200
- Optional: use K=40 for first 10 games (faster calibration)

---

## Matchmaking Queue Logic

### Join Queue
```typescript
async function joinQueue(userId: string, variant: string) {
  const rating = await getUserRating(userId);

  await db.insert('matchmaking_queue', {
    user_id: userId,
    rating: rating,
    variant: variant,
    enqueued_at: new Date()
  });

  // Trigger matching (could be immediate or via cron)
  await tryMatch(userId);
}
```

### Matching Algorithm (MVP: Simple FIFO with rating bands)

```typescript
async function runMatchmaker() {
  const queue = await db.query(`
    SELECT * FROM matchmaking_queue
    ORDER BY enqueued_at ASC
  `);

  const matched = new Set<string>();

  for (const player of queue) {
    if (matched.has(player.user_id)) continue;

    // Find opponent: same variant, closest rating, waited longest
    const opponent = queue.find(p =>
      p.user_id !== player.user_id &&
      !matched.has(p.user_id) &&
      p.variant === player.variant &&
      Math.abs(p.rating - player.rating) <= getRatingWindow(player)
    );

    if (opponent) {
      matched.add(player.user_id);
      matched.add(opponent.user_id);
      await createMatchedGame(player, opponent);
    }
  }
}

// Rating window expands with wait time
function getRatingWindow(player: QueueEntry): number {
  const waitMinutes = (Date.now() - player.enqueued_at) / 60000;

  if (waitMinutes < 1) return 100;
  if (waitMinutes < 2) return 200;
  if (waitMinutes < 5) return 400;
  return 9999;  // match anyone after 5 min
}
```

### Create Matched Game

```typescript
async function createMatchedGame(p1: QueueEntry, p2: QueueEntry) {
  // Randomly assign X/O
  const [playerX, playerO] = Math.random() < 0.5
    ? [p1, p2]
    : [p2, p1];

  const game = await db.insert('games', {
    player_x: playerX.user_id,
    player_o: playerO.user_id,
    status: 'active',
    is_rated: true,
    variant: p1.variant,
    board_state: initialBoardState(),
    turn: 'X',
    next_board: null
  });

  // Remove from queue
  await db.delete('matchmaking_queue', {
    user_id: [p1.user_id, p2.user_id]
  });

  // Notify both players (push notification)
  await notifyGameStart(game);
}
```

### Queue Cleanup
Cron job every 5 minutes:
- Remove entries older than 30 minutes
- Remove entries for users who started other games

---

## Push Notifications

### Triggers
| Event | Recipient | Message |
|-------|-----------|---------|
| Game matched | Both players | "Game found! You're playing as X" |
| Move made | Opponent | "Your turn in 9Toes" |
| Game won | Loser | "Game over — you lost to @handle" |
| Invite accepted | Inviter | "@handle joined your game" |

### APNs Integration
- Store device tokens in `user_devices` table
- Use Supabase Edge Function or dedicated worker
- Silent push for active app, alert for background

---

## Supabase Implementation Notes

### Row Level Security (RLS)

```sql
-- Users can read any user (for handles)
CREATE POLICY "Users are viewable by everyone"
  ON users FOR SELECT USING (true);

-- Games visible to participants
CREATE POLICY "Games visible to players"
  ON games FOR SELECT
  USING (auth.uid() = player_x OR auth.uid() = player_o);

-- Moves visible if you can see the game
CREATE POLICY "Moves visible to players"
  ON moves FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM games
      WHERE games.id = moves.game_id
      AND (games.player_x = auth.uid() OR games.player_o = auth.uid())
    )
  );

-- Only server can insert moves (via Edge Function)
-- Client calls Edge Function, not direct insert
```

### Edge Functions

| Function | Trigger | Purpose |
|----------|---------|---------|
| `submit-move` | HTTP POST | Validate + apply move |
| `join-matchmaking` | HTTP POST | Add to queue + try match |
| `process-queue` | Cron (30s) | Run matchmaker |
| `cleanup-queue` | Cron (5min) | Remove stale entries |

### Realtime (Phase 3)

```typescript
// Client subscribes to game updates
supabase
  .channel('game:' + gameId)
  .on('postgres_changes', {
    event: 'UPDATE',
    schema: 'public',
    table: 'games',
    filter: `id=eq.${gameId}`
  }, (payload) => {
    updateGameState(payload.new);
  })
  .subscribe();
```

---

## MVP Scope Boundaries

### In Scope
- Sign in with Apple
- Create game with invite code
- Join game via invite
- Rated matchmaking (simple FIFO + rating bands)
- Server-validated moves
- Elo ratings + leaderboard
- Push notifications ("your turn")
- Ultimate variant only for rated

### Out of Scope (Phase 2+)
- WebSocket realtime
- Tic-Tac-Ku in rated
- Doubling cube in multiplayer
- Game clocks / time controls
- Rematch / best-of-N
- Friends list
- Chat
- Spectating
- Replay sharing
- Anti-cheat beyond move validation

---

## Client Integration Checklist

iOS app needs:
- [ ] Sign in with Apple flow
- [ ] Store JWT, refresh handling
- [ ] Game list screen (polling every 30s or pull-to-refresh)
- [ ] Game screen with server state (not local-only)
- [ ] Submit move → wait for server response → update UI
- [ ] Handle move rejection gracefully
- [ ] Push notification handling (open to game)
- [ ] Matchmaking UI (searching... cancel)
- [ ] Leaderboard screen
- [ ] Profile / stats screen

---

## Open Questions

1. **Handle uniqueness** — case-insensitive? Allow special chars?
2. **Resign vs abandon** — explicit resign button, or auto-abandon after N days?
3. **Rating visibility** — show exact number, or tier/badge system?
4. **Invite expiry** — 24h default, or until explicitly cancelled?
5. **Rematch flow** — add to MVP or defer?
