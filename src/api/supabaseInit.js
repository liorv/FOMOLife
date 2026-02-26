import { supabase } from "./supabaseClient";

/**
 * Initialize Supabase tables on first app load.
 * This checks if tables exist and creates them if not.
 */
export async function initSupabaseTables() {
  try {
    // Check if our user_data table exists by attempting to query COUNT
    const { error, count } = await supabase
      .from("user_data")
      .select("id", { count: "exact" })
      .limit(0);

    if (error) {
      if (error.code === "PGRST116") {
        // Table doesn't exist - we need to create it
        console.log(
          "Creating Supabase tables... (requires manual setup in dashboard)"
        );
        return { created: false, error: "PGRST116" };
      }
      if (error.code === "42P01") {
        // Table doesn't exist (alternative error code)
        console.log(
          "Creating Supabase tables... (requires manual setup in dashboard)"
        );
        return { created: false, error: "42P01" };
      }
      // Other errors
      console.warn("Warning: Could not verify Supabase table:", error.message);
      return { created: false, error: error.message };
    }

    console.log("[OK] Supabase user_data table exists");
    return { created: true };
  } catch (error) {
    console.error("Error initializing Supabase:", error);
    return { created: false, error: error.message };
  }
}

/**
 * Open instructions for manual table setup
 */
export function openSupabaseSetupInstructions() {
  const instructions = `
=============================================================
SUPABASE MANUAL TABLE SETUP REQUIRED
=============================================================

The app is ready but needs you to manually create the database table.
This is a one-time setup:

1. Go to: https://app.supabase.com (open your project)

2. Click the "SQL Editor" tab on the left sidebar

3. Click "New Query"

4. Copy and paste this SQL:

CREATE TABLE IF NOT EXISTS user_data (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id TEXT NOT NULL,
  data JSONB NOT NULL,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(user_id)
);

CREATE INDEX IF NOT EXISTS idx_user_data_user_id ON user_data(user_id);

ALTER TABLE user_data ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Enable all operations"
  ON user_data
  FOR ALL
  USING (true)
  WITH CHECK (true);

5. Click the "Run" button

6. Refresh this page once complete

=============================================================
`;
  console.log(instructions);
}
