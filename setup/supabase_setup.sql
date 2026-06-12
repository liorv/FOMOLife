-- Run this SQL in your Supabase dashboard to set up the database tables
-- Go to SQL Editor -> New Query and paste this content

-- Create user_data table
CREATE TABLE IF NOT EXISTS user_data (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id TEXT NOT NULL,
  data JSONB NOT NULL,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(user_id)
);

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_user_data_user_id ON user_data(user_id);

-- Grant explicit access to the Data API roles (required for PostgREST/supabase-js)
-- as of Supabase's May 2026 change: new tables in public schema need explicit GRANTs
GRANT USAGE ON SCHEMA public TO anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.user_data TO authenticated;
GRANT SELECT ON TABLE public.user_data TO anon;

-- Enable Row Level Security
ALTER TABLE user_data ENABLE ROW LEVEL SECURITY;

-- Create a policy to allow anyone to read and write their own data
CREATE POLICY "Users can manage their own data"
  ON user_data
  USING (user_id = current_user_id())
  WITH CHECK (user_id = current_user_id());

-- ─────────────────────────────────────────────────────────────────────────────
-- Admin Activity Snapshots — daily time-series metrics
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS admin_activity_snapshots (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  date        DATE        NOT NULL,
  total_users INTEGER     NOT NULL DEFAULT 0,
  new_users   INTEGER     NOT NULL DEFAULT 0,
  active_users INTEGER    NOT NULL DEFAULT 0,
  total_projects INTEGER  NOT NULL DEFAULT 0,
  new_projects   INTEGER  NOT NULL DEFAULT 0,
  total_tasks    INTEGER  NOT NULL DEFAULT 0,
  new_tasks      INTEGER  NOT NULL DEFAULT 0,
  completed_tasks INTEGER NOT NULL DEFAULT 0,
  total_contacts  INTEGER NOT NULL DEFAULT 0,
  new_contacts    INTEGER NOT NULL DEFAULT 0,
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(date)
);

CREATE INDEX IF NOT EXISTS idx_admin_snapshots_date ON admin_activity_snapshots(date);

-- Conversation columns (added after initial release)
ALTER TABLE admin_activity_snapshots ADD COLUMN IF NOT EXISTS total_feedback INTEGER NOT NULL DEFAULT 0;
ALTER TABLE admin_activity_snapshots ADD COLUMN IF NOT EXISTS total_feedback_comments INTEGER NOT NULL DEFAULT 0;
ALTER TABLE admin_activity_snapshots ADD COLUMN IF NOT EXISTS total_project_thread_comments INTEGER NOT NULL DEFAULT 0;

-- Only service-role (used by the cron and admin API) can access this table.
-- Deny all access to anon and authenticated roles.
ALTER TABLE admin_activity_snapshots ENABLE ROW LEVEL SECURITY;
-- No public policies — access is exclusively via the service role key.


-- For public read/write (simpler, less secure):
-- Comment out the policy above and uncomment this instead:
-- CREATE POLICY "Enable all operations for authenticated users"
--   ON user_data
--   FOR ALL
--   USING (true)
--   WITH CHECK (true);

-- If you want to allow anonymous access (less secure):
-- ALTER POLICY "Enable all operations for authenticated users" 
-- ON user_data 
-- USING (true) 
-- WITH CHECK (true);
