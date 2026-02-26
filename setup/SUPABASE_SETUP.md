# Supabase Integration Setup Guide

## What's Done
✅ Supabase client library installed (`@supabase/supabase-js`)
✅ Environment variables configured in `.env.local`
✅ Supabase client created (`src/api/supabaseClient.js`)
✅ Supabase storage adapter created (`src/api/supabaseStorage.js`)
✅ SQL schema provided (`supabase_setup.sql`)

## Next Steps

### 1. Create the Database Tables

1. Go to [Supabase Dashboard](https://app.supabase.com)
2. Select your project
3. Navigate to **SQL Editor** (left sidebar)
4. Click **New Query**
5. Copy the entire content from `supabase_setup.sql` in this project
6. Paste it into the SQL editor
7. Click **Run**

This creates:
- `user_data` table with columns: `id`, `user_id`, `data` (JSONB), `created_at`, `updated_at`
- RLS policies for security
- Index for fast lookups

### 2. Update Your App to Use Supabase

You now have two storage options:

**Option A: Keep using JSON files (current setup)**
- No changes needed
- Data stays local

**Option B: Use Supabase (recommended for production)**
- Edit `src/api/db.js` to import from `supabaseStorage` instead of `storage`

In `src/api/db.js`, replace:
```javascript
import { loadData as rawLoad, saveData as rawSave } from "./storage";
```

With:
```javascript
import { loadData as rawLoad, saveData as rawSave } from "./supabaseStorage";
```

Then initialize tables on app startup by adding this to `src/App.js`:
```javascript
import { initSupabaseTables } from "./api/supabaseStorage";

// In your App component's useEffect:
useEffect(() => {
  initSupabaseTables();
}, []);
```

### 3. Test the Connection

Run your app:
```bash
npm run dev
```

Check browser console for any Supabase errors. All data operations should now use Supabase.

### 4. Deploy to Vercel

Add environment variables to Vercel:

```bash
vercel env add NEXT_PUBLIC_SUPABASE_URL
vercel env add NEXT_PUBLIC_SUPABASE_ANON_KEY
vercel env add SUPABASE_SERVICE_ROLE_KEY
```

Then deploy:
```bash
vercel --prod
```

## Credentials

- **Project URL**: *(find in Supabase → Project Settings → API → Project URL)*
- **Anon Key**: *(find in Supabase → Project Settings → API → anon public)*
- **Service Role Key**: *(find in Supabase → Project Settings → API → service_role — keep secret, never commit)*

## Data Structure

Data is stored as JSONB in `user_data.data` with this shape:
```json
{
  "tasks": [...],
  "projects": [...],
  "dreams": [...],
  "people": [...]
}
```

Each user has their own row identified by `user_id` (defaults to `"default"`).

## File Changes Made

- `src/api/supabaseClient.js` - Supabase client initialization
- `src/api/supabaseStorage.js` - Adapter to use Supabase instead of files
- `.env.local` - Environment variables added
- `.env.example` - Template for environment variables
- `supabase_setup.sql` - Database schema

## Troubleshooting

### "Missing Supabase environment variables"
- Check `.env.local` has both `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY`

### "PGRST116: Relation not found"
- Run the SQL from `supabase_setup.sql` in your Supabase SQL Editor

### RLS Policy Errors
- Check Supabase Dashboard → Authentication → Users (if using auth)
- For now, the setup allows public access. Secure later with proper auth.

## Security Note

The current setup allows public read/write access. For production:
1. Enable Supabase Auth
2. Update RLS policies to authenticate users
3. Keep `SUPABASE_SERVICE_ROLE_KEY` secret (never commit, only on server)
