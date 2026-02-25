# Supabase Authentication Setup — FOMO Life

This document covers the one-time steps needed to activate Google OAuth login
and secure the database so each user can only see their own data.

---

## 1. Enable Google OAuth in Supabase

### 1a. Create a Google OAuth App

1. Go to the [Google Cloud Console](https://console.cloud.google.com/) and
   create or select a project.
2. Navigate to **APIs & Services → Credentials → Create Credentials →
   OAuth 2.0 Client IDs**.
3. Set **Application type** to **Web application**.
4. Under **Authorized redirect URIs** add:
   ```
   https://<YOUR-SUPABASE-PROJECT-REF>.supabase.co/auth/v1/callback
   ```
   (Replace `<YOUR-SUPABASE-PROJECT-REF>` with your actual project ref, e.g.
   `paiczvbfstfvibijeivw`.)
5. Save and note the **Client ID** and **Client Secret**.

### 1b. Configure Supabase

1. Open your [Supabase dashboard](https://app.supabase.com/).
2. Navigate to **Authentication → Providers**.
3. Click **Google** and toggle it on.
4. Paste the **Client ID** and **Client Secret** from step 1a.
5. Click **Save**.

### 1c. Add your site URL

1. In Supabase, go to **Authentication → URL Configuration**.
2. Set **Site URL** to your production domain, e.g.
   `https://fomo-life.vercel.app`.
3. Under **Redirect URLs**, add:
   - `https://fomo-life.vercel.app` (production)
   - `http://localhost:3000` (local dev)

---

## 2. Secure the `user_data` table with Row Level Security

Run the following SQL in your Supabase **SQL Editor**. It ensures each user can
only read and write their own row.

```sql
-- Enable RLS on the user_data table (safe to run multiple times)
ALTER TABLE user_data ENABLE ROW LEVEL SECURITY;

-- Drop any old open policy if present
DROP POLICY IF EXISTS "Allow all" ON user_data;

-- Users may only SELECT/INSERT/UPDATE/DELETE their own row.
-- auth.uid() returns the UUID of the currently-authenticated Supabase user.
CREATE POLICY "Users can only access their own data"
  ON user_data
  FOR ALL
  USING      (auth.uid()::text = user_id)
  WITH CHECK (auth.uid()::text = user_id);
```

> **Why `::text`?**  The `user_id` column is stored as `text`.  Supabase's
> `auth.uid()` returns a `uuid` type, so the cast keeps the comparison
> type-safe.

---

## 3. Environment variables

Ensure the following are set in your deployment (Vercel) and locally in
`.env.local`:

```env
NEXT_PUBLIC_SUPABASE_URL=https://<YOUR-PROJECT-REF>.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=<your-anon-key>
```

Both values are available in Supabase under **Project Settings → API**.

---

## 4. Adding more OAuth providers later

The identity provider list lives in one place:
[`src/contexts/AuthContext.js`](src/contexts/AuthContext.js) — the `PROVIDERS`
array.

To enable, say, **Microsoft** (Azure), once you've created the OAuth app in
Azure and configured it in Supabase:

1. In `PROVIDERS`, find the `azure` entry and change `enabled: false` to
   `enabled: true`.
2. Drop the matching SVG icon into `public/assets/auth/microsoft.svg`.
3. That's it — the button appears on the login screen automatically.

The same pattern works for Apple, X (Twitter), and Facebook.

---

## 5. How user data works after authentication

| Situation | Outcome |
|---|---|
| First time sign-in with Google | Supabase Auth creates a user record; app finds no `user_data` row and starts with empty tasks/projects |
| Subsequent sign-ins | Session is restored automatically; existing data is loaded |
| User signs out | Session cleared; login screen shown |
| Another browser / device | Same Google account → same data, because `userId = auth.uid()` |
