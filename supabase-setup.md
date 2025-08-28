# 🚀 Supabase Setup for Global Leaderboards

## What is Supabase?
Supabase is a free, open-source alternative to Firebase that provides a PostgreSQL database with real-time capabilities.

## Setup Steps:

### 1. Create Supabase Account
1. Go to [supabase.com](https://supabase.com)
2. Click "Start your project" and sign up
3. Create a new project (free tier)

### 2. Create Database Table
Once your project is created, go to the SQL Editor and run this:

```sql
-- Create the scores table
CREATE TABLE scores (
  id SERIAL PRIMARY KEY,
  username VARCHAR(50) NOT NULL,
  score INTEGER NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create an index for faster queries
CREATE INDEX idx_scores_score ON scores(score ASC);

-- Enable Row Level Security (RLS)
ALTER TABLE scores ENABLE ROW LEVEL SECURITY;

-- Allow anyone to read scores (for leaderboard)
CREATE POLICY "Allow public read access" ON scores
  FOR SELECT USING (true);

-- Allow anyone to insert scores (for new games)
CREATE POLICY "Allow public insert access" ON scores
  FOR INSERT WITH CHECK (true);
```

### 3. Get Your API Keys
1. Go to Settings → API
2. Copy your "Project URL" and "anon public" key
3. Replace the placeholders in `script.js`

## Benefits:
✅ **Global leaderboard** - All players see the same scores  
✅ **Real-time updates** - Scores appear instantly  
✅ **Free tier** - 500MB database, 50,000 monthly active users  
✅ **No backend code** - Pure frontend with API calls  
✅ **Secure** - Built-in authentication and security  

## Alternative: Firebase
If you prefer Firebase, I can set that up instead. Both work great for this use case!
