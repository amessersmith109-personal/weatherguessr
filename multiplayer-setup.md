# 🎮 Multiplayer Setup Guide

## Database Tables Needed

### 1. Online Players Table
```sql
-- Track who's currently online
CREATE TABLE online_players (
  id SERIAL PRIMARY KEY,
  username VARCHAR(50) UNIQUE NOT NULL,
  last_seen TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  is_available BOOLEAN DEFAULT true
);

-- Index for quick lookups
CREATE INDEX idx_online_players_available ON online_players(is_available, last_seen);

-- RLS Policies
ALTER TABLE online_players ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow public read access" ON online_players
  FOR SELECT USING (true);

CREATE POLICY "Allow public insert/update" ON online_players
  FOR ALL USING (true);
```

### 2. Game Invitations Table
```sql
-- Track game invitations
CREATE TABLE game_invitations (
  id SERIAL PRIMARY KEY,
  from_username VARCHAR(50) NOT NULL,
  to_username VARCHAR(50) NOT NULL,
  status VARCHAR(20) DEFAULT 'pending', -- pending, accepted, declined, expired
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  expires_at TIMESTAMP WITH TIME ZONE DEFAULT (NOW() + INTERVAL '5 minutes')
);

-- Indexes
CREATE INDEX idx_invitations_to_user ON game_invitations(to_username, status);
CREATE INDEX idx_invitations_status ON game_invitations(status, created_at);

-- RLS Policies
ALTER TABLE game_invitations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow public read access" ON game_invitations
  FOR SELECT USING (true);

CREATE POLICY "Allow public insert/update" ON game_invitations
  FOR ALL USING (true);
```

### 3. Multiplayer Games Table
```sql
-- Track active multiplayer games
CREATE TABLE multiplayer_games (
  id SERIAL PRIMARY KEY,
  player1 VARCHAR(50) NOT NULL,
  player2 VARCHAR(50) NOT NULL,
  current_round INTEGER DEFAULT 1,
  player1_wins INTEGER DEFAULT 0,
  player2_wins INTEGER DEFAULT 0,
  game_state JSONB DEFAULT '{}',
  status VARCHAR(20) DEFAULT 'active', -- active, completed
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_multiplayer_games_players ON multiplayer_games(player1, player2);
CREATE INDEX idx_multiplayer_games_status ON multiplayer_games(status);

-- RLS Policies
ALTER TABLE multiplayer_games ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow public read access" ON multiplayer_games
  FOR SELECT USING (true);

CREATE POLICY "Allow public insert/update" ON multiplayer_games
  FOR ALL USING (true);
```

## Real-time Features
- **Player Status Updates** - See who's online in real-time
- **Game State Sync** - Both players see the same game state
- **Live Match Updates** - Real-time score and round updates
- **Chat System** - Optional in-game messaging

## Game Flow
1. Player clicks "Multiplayer"
2. See list of online players
3. Send invitation to specific player
4. Both players accept → Start game
5. Split-screen interface shows both players
6. Best of 7 series with real-time updates
7. Winner is determined by most round wins
