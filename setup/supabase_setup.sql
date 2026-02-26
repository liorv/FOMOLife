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

-- Enable Row Level Security
ALTER TABLE user_data ENABLE ROW LEVEL SECURITY;

-- Create a policy to allow anyone to read and write their own data
CREATE POLICY "Users can manage their own data"
  ON user_data
  USING (user_id = current_user_id())
  WITH CHECK (user_id = current_user_id());

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
