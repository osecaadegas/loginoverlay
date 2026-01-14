# Domain Update Checklist for osecaadegas.pt

Your new domain: **https://osecaadegas.pt** (or https://www.osecaadegas.pt)

## ✅ Completed
- [x] Domain added to Vercel
- [x] SSL certificate active
- [x] DNS configured

## 🔧 Required Updates

### 1. Supabase URL Configuration
Go to: Supabase Dashboard → Authentication → URL Configuration

**Site URL:**
```
https://osecaadegas.pt
```

**Redirect URLs (Add all of these):**
```
https://osecaadegas.pt/**
https://www.osecaadegas.pt/**
https://dkfllpjfrhdfvtbltrsy.supabase.co/auth/v1/callback
```

### 2. Twitch Developer Console
Go to: https://dev.twitch.tv/console/apps

**Keep ONLY this OAuth Redirect URL:**
```
https://dkfllpjfrhdfvtbltrsy.supabase.co/auth/v1/callback
```

**Remove these (not needed):**
- ❌ https://osecaadegas.pt/auth/callback
- ❌ https://osecaadegas.pt

### 3. Fix user_profiles RLS (400 errors)
Run the SQL migration: `migrations/fix_user_profiles_rls.sql`

This will fix the 400 errors when loading profiles.

### 4. Clear Browser Cache
After all changes, do a hard refresh:
- Chrome/Edge: `Ctrl + Shift + Delete` → Clear cached images and files
- Or use `Ctrl + F5` for hard refresh

### 5. Verify Twitch Embed Parent
The Twitch embeds automatically use `window.location.hostname`, so they should work with your new domain. If you see issues, add your domain to Twitch's allowed parents in their developer console.

## 🔍 Troubleshooting "Not Secure" Warning

If you still see "Not Secure" after the above:

1. **Check Console (F12)** - Look for mixed content warnings
2. **Verify all external resources use HTTPS:**
   - Twitch player: ✅ Uses HTTPS
   - StreamElements API: ✅ Uses HTTPS
   - Unsplash images: ✅ Uses HTTPS
   - Supabase: ✅ Uses HTTPS

3. **Check database images** - If you added any casino offers, items, or images manually in the admin panel, make sure they use `https://` URLs, not `http://`

4. **Browser extensions** - Disable them temporarily to see if one is injecting HTTP content

## 📝 No Code Changes Needed

Your app already uses environment variables and relative URLs, so no code changes are required for the domain change. Everything is configured through:
- Vercel environment variables (VITE_SUPABASE_URL, VITE_SUPABASE_ANON_KEY)
- Supabase dashboard settings
- Twitch developer console settings
