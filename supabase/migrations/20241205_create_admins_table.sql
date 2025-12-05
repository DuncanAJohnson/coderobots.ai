-- Create admins table for managing admin users
-- Admins can access the data export functionality

CREATE TABLE IF NOT EXISTS admins (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(user_id)
);

-- Create index for efficient lookups
CREATE INDEX IF NOT EXISTS idx_admins_user_id ON admins(user_id);

-- Enable Row Level Security
ALTER TABLE admins ENABLE ROW LEVEL SECURITY;

-- RLS Policy: Only service role can access this table
-- This prevents regular users from querying admin status directly
CREATE POLICY "Service role full access"
  ON admins
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- Add comment explaining the table
COMMENT ON TABLE admins IS 'Stores user_ids of admin users who can access data export functionality';

-- Example: To add an admin user, run this SQL in Supabase Dashboard:
-- INSERT INTO admins (user_id) SELECT id FROM auth.users WHERE email = 'admin@example.com';

