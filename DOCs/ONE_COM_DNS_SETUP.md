# DNS Setup Guide for Streamers Center -> Vercel

Use this when moving the production site to `streamerscenter.com`.

## Domains to add in Vercel

Add both domains to the Vercel project:

```text
streamerscenter.com
www.streamerscenter.com
```

Set one as canonical. The cleanest setup is:

```text
https://streamerscenter.com
```

Then redirect `www.streamerscenter.com` to the root domain.

## DNS records

In your domain provider DNS panel, create or update these records:

```text
Name    Type    Value
@       A       76.76.21.21
www     CNAME   cname.vercel-dns.com
```

Use the provider default TTL, or set `300` while you are migrating.

## Records to remove

Remove stale records that point to the old production domain, old Vercel project aliases, parking pages, or old IP addresses. Only one root A record and one `www` CNAME should be active for the Vercel site.

## Provider tips

If your DNS provider does not use `@`, enter the full root domain:

```text
streamerscenter.com
```

For `www`, enter only:

```text
www
```

Most DNS panels append the root domain automatically, so avoid entering `www.streamerscenter.com` unless the provider specifically asks for a full host name.

## Verify in Vercel

1. Open the Vercel project settings.
2. Go to Domains.
3. Add `streamerscenter.com`.
4. Add `www.streamerscenter.com`.
5. Click refresh or retry until both show valid configuration.
6. Wait for Vercel to issue SSL certificates.

## Test the live domain

After DNS propagates, test these URLs:

```text
https://streamerscenter.com
https://www.streamerscenter.com
https://streamerscenter.com/login
https://streamerscenter.com/overlay
https://streamerscenter.com/sitemap.xml
```

The `www` domain should redirect to the canonical root domain if that is how Vercel is configured.

## Propagation checks

Use these if Vercel still says the domain is misconfigured:

```text
https://dnschecker.org/#A/streamerscenter.com
https://dnschecker.org/#CNAME/www.streamerscenter.com
```

Expected DNS:

```text
streamerscenter.com      A       76.76.21.21
www.streamerscenter.com  CNAME   cname.vercel-dns.com
```

## Related app settings

After DNS is valid, update the production URL anywhere external services cache it:

- Supabase Authentication Site URL and Redirect URLs.
- Google OAuth authorized origins and redirect URIs.
- Twitch OAuth redirect URLs.
- Vercel environment variables such as `OVERLAY_DOMAIN` and `VITE_EBS_URL`.
- OBS browser-source URLs for live overlays.
- Search Console/Bing Webmaster Tools sitemap submissions.

See `DOMAIN_UPDATE_CHECKLIST.md` for the full migration checklist.
