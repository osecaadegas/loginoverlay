# 🔑 Get Your Supabase Service Role Key

## Steps:

1. Go to your Supabase Dashboard: https://supabase.com/dashboard
2. Select your project
3. Click **Settings** (⚙️ gear icon in left sidebar)
4. Click **API**
5. Scroll down to **Project API keys**
6. Find the **service_role** key (marked as "secret")
7. Click to reveal and copy it

## Add to .env File:

Open your `.env` file and add this line:

```env
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key-here
```

⚠️ **IMPORTANT**: Never commit the service role key to git! It bypasses all security.

## Then Run Upload Again:

```powershell
node scripts/uploadSlots.js
```

## Why Service Role Key?

The service role key bypasses Row Level Security (RLS) policies, which is needed for this admin operation (bulk uploading data). Your app will continue to use the anon key for normal operations.
