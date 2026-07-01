# Domain Update Checklist for Streamers Center

Primary domain: **https://streamerscenter.com**

Optional www alias: **https://www.streamerscenter.com**

## Code references already updated

- Static SEO metadata in `index.html`
- Client-side route SEO in `src/utils/seo.js`
- Public sitemap in `public/sitemap.xml`
- Robots sitemap pointer in `public/robots.txt`
- Legal website references in Privacy Policy and Terms
- Twitch embed parent domains in `src/components/StreamsPage/StreamsPage.jsx`
- Raid shoutout clip embed fallback in `api/raid-shoutout.js`
- Example deployment env values in `.env.example`

## Required dashboard updates

### 1. Vercel domains

Go to Vercel Project -> Settings -> Domains.

Add:

```text
streamerscenter.com
www.streamerscenter.com
```

Set the preferred redirect direction. Recommended:

```text
www.streamerscenter.com -> streamerscenter.com
```

### 2. DNS provider

At your DNS provider, point the domain to Vercel.

Typical Vercel DNS setup:

```text
A     @      76.76.21.21
CNAME www    cname.vercel-dns.com
```

Wait for Vercel to show valid DNS and active SSL.

### 3. Supabase auth URLs

Go to Supabase Dashboard -> Authentication -> URL Configuration.

Site URL:

```text
https://streamerscenter.com
```

Redirect URLs:

```text
https://streamerscenter.com/**
https://www.streamerscenter.com/**
https://dkfllpjfrhdfvtbltrsy.supabase.co/auth/v1/callback
```

Keep the Supabase callback URL because Twitch/Discord/Google auth flows return through Supabase.

### 4. OAuth app dashboards

Check each provider used for login.

Twitch Developer Console:

```text
https://dkfllpjfrhdfvtbltrsy.supabase.co/auth/v1/callback
```

Discord Developer Portal:

```text
https://dkfllpjfrhdfvtbltrsy.supabase.co/auth/v1/callback
```

Google Cloud Console:

```text
https://dkfllpjfrhdfvtbltrsy.supabase.co/auth/v1/callback
```

If a provider also has allowed origins, add:

```text
https://streamerscenter.com
https://www.streamerscenter.com
```

### 5. Vercel environment variables

Set these production values:

```text
OVERLAY_DOMAIN=streamerscenter.com
VITE_EBS_URL=https://streamerscenter.com
```

Keep existing Supabase, Twitch, StreamElements, Spotify, and Discord secrets unchanged unless those apps are also being replaced.

### 6. Twitch embeds and OBS URLs

Twitch embed parents must include the deployed hostname:

```text
streamerscenter.com
www.streamerscenter.com
localhost
```

Existing OBS browser-source URLs using the old domain should be replaced with the new domain:

```text
https://streamerscenter.com/overlay/<overlay-token>
```

Widget-only OBS URLs follow the same pattern:

```text
https://streamerscenter.com/overlay/<overlay-token>?widget=<widget-id>
```

### 7. Search and saved links

After deploy:

- Submit `https://streamerscenter.com/sitemap.xml` in Google Search Console.
- Add a 301 redirect from the old domain to the new domain if you keep the old domain.
- Update any saved OBS browser sources, StreamElements commands, browser bookmarks, and external references you still control.

### 8. Remaining account links in code

The public social footer links were removed. If the Twitch stream channel or repository changes later, update these files:

```text
src/components/StreamsPage/StreamsPage.jsx      Twitch player/channel
src/components/DeveloperPage/DeveloperPage.jsx  GitHub repository quick link
```

Do this only once the replacement stream channel/repository exists, so the current live functionality does not turn into a broken destination.

## Smoke test

After DNS and deploy are live, test:

```text
https://streamerscenter.com
https://streamerscenter.com/login
https://streamerscenter.com/offers
https://streamerscenter.com/privacy
https://streamerscenter.com/terms
https://streamerscenter.com/overlay-center
https://streamerscenter.com/overlay/<overlay-token>
```

Then hard refresh the browser and update any old saved links.
