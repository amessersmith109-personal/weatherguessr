-- Multiplayer Database Setup for Weatherguessr
-- Run these commands in your Supabase SQL Editor

-- 1. Online Players Table
CREATE TABLE IF NOT EXISTS online_players (
  id SERIAL PRIMARY KEY,
  username VARCHAR(50) UNIQUE NOT NULL,
  last_seen TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  is_available BOOLEAN DEFAULT true
);

-- Index for quick lookups
CREATE INDEX IF NOT EXISTS idx_online_players_available ON online_players(is_available, last_seen);

-- RLS Policies
ALTER TABLE online_players ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow public read access" ON online_players;
CREATE POLICY "Allow public read access" ON online_players
  FOR SELECT USING (true);

DROP POLICY IF EXISTS "Allow public insert/update" ON online_players;
CREATE POLICY "Allow public insert/update" ON online_players
  FOR ALL USING (true);

-- 2. Game Invitations Table
CREATE TABLE IF NOT EXISTS game_invitations (
  id SERIAL PRIMARY KEY,
  from_username VARCHAR(50) NOT NULL,
  to_username VARCHAR(50) NOT NULL,
  status VARCHAR(20) DEFAULT 'pending', -- pending, accepted, declined, expired
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  expires_at TIMESTAMP WITH TIME ZONE DEFAULT (NOW() + INTERVAL '5 minutes')
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_invitations_to_user ON game_invitations(to_username, status);
CREATE INDEX IF NOT EXISTS idx_invitations_status ON game_invitations(status, created_at);

-- RLS Policies
ALTER TABLE game_invitations ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow public read access" ON game_invitations;
CREATE POLICY "Allow public read access" ON game_invitations
  FOR SELECT USING (true);

DROP POLICY IF EXISTS "Allow public insert/update" ON game_invitations;
CREATE POLICY "Allow public insert/update" ON game_invitations
  FOR ALL USING (true);

-- 3. Multiplayer Games Table
CREATE TABLE IF NOT EXISTS multiplayer_games (
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
CREATE INDEX IF NOT EXISTS idx_multiplayer_games_players ON multiplayer_games(player1, player2);
CREATE INDEX IF NOT EXISTS idx_multiplayer_games_status ON multiplayer_games(status);

-- RLS Policies
ALTER TABLE multiplayer_games ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow public read access" ON multiplayer_games;
CREATE POLICY "Allow public read access" ON multiplayer_games
  FOR SELECT USING (true);

DROP POLICY IF EXISTS "Allow public insert/update" ON multiplayer_games;
CREATE POLICY "Allow public insert/update" ON multiplayer_games
  FOR ALL USING (true);

-- Success message
SELECT 'Multiplayer tables created successfully!' as status;
