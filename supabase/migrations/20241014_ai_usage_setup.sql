-- AI Usage Tracking System
-- Migration to create ai_usage table and user access level management

-- Create ai_usage table for tracking token usage and costs
CREATE TABLE IF NOT EXISTS ai_usage (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  model TEXT NOT NULL,
  input_tokens INTEGER NOT NULL DEFAULT 0,
  output_tokens INTEGER NOT NULL DEFAULT 0,
  cached_input_tokens INTEGER NOT NULL DEFAULT 0,
  reasoning_tokens INTEGER NOT NULL DEFAULT 0,
  cost_usd NUMERIC(10, 6) NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create index for efficient queries by user and timestamp
CREATE INDEX IF NOT EXISTS idx_ai_usage_user_timestamp ON ai_usage(user_id, timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_ai_usage_user_model ON ai_usage(user_id, model);

-- Enable Row Level Security
ALTER TABLE ai_usage ENABLE ROW LEVEL SECURITY;

-- RLS Policy: Users can only read their own usage records
CREATE POLICY "Users can view own ai_usage records"
  ON ai_usage
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

-- RLS Policy: Only service role can insert usage records
-- This prevents users from manipulating their usage data
CREATE POLICY "Service role can insert ai_usage records"
  ON ai_usage
  FOR INSERT
  TO service_role
  WITH CHECK (true);

-- Add access_level to user metadata
-- We'll use auth.users metadata for storing access level
-- Access levels: 'en1' for EN1 deployment users, 'standard' for others
-- This can be set via Supabase dashboard or auth triggers

-- Create a function to get user access level from metadata
CREATE OR REPLACE FUNCTION get_user_access_level(user_id UUID)
RETURNS TEXT AS $$
DECLARE
  access_level TEXT;
BEGIN
  SELECT (raw_user_meta_data->>'access_level')::TEXT
  INTO access_level
  FROM auth.users
  WHERE id = user_id;
  
  -- Default to 'standard' if not set
  RETURN COALESCE(access_level, 'standard');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION get_user_access_level(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION get_user_access_level(UUID) TO service_role;

-- Add comment explaining the table structure
COMMENT ON TABLE ai_usage IS 'Tracks AI token usage and costs per user for budget enforcement';
COMMENT ON COLUMN ai_usage.model IS 'OpenAI model name (gpt-5, gpt-5-mini, gpt-5-nano)';
COMMENT ON COLUMN ai_usage.cost_usd IS 'Calculated cost in USD based on token usage';

