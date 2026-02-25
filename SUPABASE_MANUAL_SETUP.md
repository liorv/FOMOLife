# Supabase Manual Setup Instructions

The PostgreSQL direct connection is blocked by your network/firewall. Here's the easy manual setup:

## 1. Go to Supabase Dashboard

Visit: https://app.supabase.com/project/paiczvbfstfvibijeivw

## 2. Open SQL Editor

- Click **SQL Editor** in the left sidebar
- Click **New Query**

## 3. Copy This SQL

```sql
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

-- Enable public read/write (for now, secure later)
CREATE POLICY "Enable all operations"
  ON user_data
  FOR ALL
  USING (true)
  WITH CHECK (true);
```

## 4. Run It

Click the **Run** button (or Ctrl+Enter)

You should see: ✓ Success. No rows returned

## 5. Verify

Go to **Table Editor** (left sidebar) and you should see `user_data` table listed.

## 6. Done!

Your Supabase database is ready! The app will now work with Supabase for data storage.

---

## If You Want to Use Supabase Instead of JSON Files

Edit `src/api/db.js` and change this line:
```javascript
import { loadData as rawLoad, saveData as rawSave } from "./storage";
```

To:
```javascript
import { loadData as rawLoad, saveData as rawSave } from "./supabaseStorage";
```

Then add this to your App component:
```javascript
import { initSupabaseTables } from "./api/supabaseInit";

useEffect(() => {
  initSupabaseTables();
}, []);
```

---

## Need Help?

- **Supabase Docs**: https://supabase.com/docs
- **FAQ**: See SUPABASE_SETUP.md in the project root
