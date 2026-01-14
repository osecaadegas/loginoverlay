# One.com DNS Setup Guide for osecaadegas.pt → Vercel

## Step-by-Step Instructions

### Step 1: Log into One.com
1. Go to https://www.one.com/admin/
2. Log in with your credentials
3. Find your domain **osecaadegas.pt** in the dashboard

### Step 2: Access DNS Settings
1. Click on your domain **osecaadegas.pt**
2. Look for **"DNS Settings"** or **"Advanced DNS"** in the menu
3. You should see a list of current DNS records

### Step 3: Update Root Domain (osecaadegas.pt)

**Current Record (DELETE or UPDATE):**
- Type: `A`
- Name: `@` or `osecaadegas.pt`
- Value: `216.198.79.1` ❌ (old IP)

**New Record (ADD or UPDATE TO):**
- Type: `A`
- Name: `@` (or leave blank, or `osecaadegas.pt`)
- Value: `76.76.21.21` ✅ (Vercel's IP)
- TTL: `3600` or leave default

### Step 4: Update WWW Subdomain

**Current Record (DELETE):**
- Type: `CNAME`
- Name: `www`
- Value: `4ea52815cdafd94.vercel-dns-017.com` ❌ (old)

**New Record (ADD or UPDATE TO):**
- Type: `CNAME`
- Name: `www`
- Value: `cname.vercel-dns.com` ✅
- TTL: `3600` or leave default

### Step 5: Remove Old Records (if they exist)
Delete any other A or CNAME records pointing to old Vercel URLs or IPs.

### Step 6: Save Changes
1. Click **"Save"** or **"Apply Changes"**
2. One.com will show a confirmation message
3. Wait 10-30 minutes for DNS propagation (sometimes up to 48 hours, but usually much faster)

---

## One.com Specific Tips

### Where to Find DNS Settings:
```
One.com Dashboard
└── Your Domains
    └── osecaadegas.pt
        └── Settings or Advanced Settings
            └── DNS Settings or DNS Management
```

### Common One.com DNS Interface Locations:
- **Option 1:** Dashboard → Domains → osecaadegas.pt → Advanced DNS
- **Option 2:** Dashboard → Technical Settings → DNS
- **Option 3:** Under domain name, look for "Nameservers" or "DNS" tab

### Important Notes for One.com:
1. **Root Domain (@):**
   - Some interfaces show `@`, others show the full domain `osecaadegas.pt`
   - Both mean the same thing - the root domain
   
2. **WWW Record:**
   - The name should be exactly: `www`
   - NOT `www.osecaadegas.pt` (one.com adds the domain automatically)

3. **TTL (Time To Live):**
   - Default is usually 3600 seconds (1 hour)
   - You can leave it as default or set to 300 for faster updates during setup

4. **Record Priority:**
   - If one.com asks for "Priority" on CNAME records, leave it blank or set to `0`

---

## After Saving DNS Changes

### Step 7: Verify in Vercel
1. Go back to Vercel: https://vercel.com/osecaadegas95-5338s-projects/loginoverlay/settings/domains
2. Click **"Refresh"** button next to both domains
3. Wait for the "Invalid Configuration" warning to disappear
4. SSL certificate will be issued automatically (green checkmark)

### Step 8: Test Your Domain
After DNS propagates (10-30 minutes):
1. Open browser in Incognito/Private mode
2. Go to: https://osecaadegas.pt
3. Should load your site with SSL (padlock icon)
4. Go to: https://www.osecaadegas.pt
5. Should also work with SSL

### Step 9: Clear Cache
Once SSL is active:
1. Press `Ctrl + Shift + Delete` in your browser
2. Clear "Cached images and files"
3. Do a hard refresh: `Ctrl + F5`

---

## Troubleshooting

### "Not Secure" Warning Still Shows
**Cause:** DNS hasn't propagated yet or old DNS is cached
**Solution:** 
- Wait longer (up to 48 hours max)
- Check DNS propagation: https://dnschecker.org/#A/osecaadegas.pt
- Clear browser cache and cookies
- Try different browser or incognito mode

### "Invalid Configuration" in Vercel
**Cause:** DNS records don't match Vercel's requirements
**Solution:**
- Double-check the A record points to `76.76.21.21`
- Double-check CNAME points to `cname.vercel-dns.com` (NOT the old one)
- Click "Refresh" in Vercel after confirming DNS

### Can't Find DNS Settings in One.com
**Solution:**
1. Look for "Advanced Settings" or "Expert Mode"
2. Contact One.com support - ask them to point your domain to Vercel
3. Give them these values:
   - A record: `76.76.21.21`
   - CNAME www: `cname.vercel-dns.com`

### One.com Shows Nameserver Conflict
**Issue:** Domain might be using One.com's parking nameservers
**Solution:**
- Make sure your domain is using one.com's default nameservers
- Or switch to custom nameservers if you want more control
- Keep it simple: use one.com's DNS management

---

## Quick Reference Card

Copy this for easy reference:

```
Domain: osecaadegas.pt
Vercel Project: loginoverlay

DNS Records Needed:
┌──────────┬──────┬─────────────────────────┐
│ Name     │ Type │ Value                   │
├──────────┼──────┼─────────────────────────┤
│ @        │ A    │ 76.76.21.21             │
│ www      │ CNAME│ cname.vercel-dns.com    │
└──────────┴──────┴─────────────────────────┘

Delete Old Records:
- A record to 216.198.79.1
- CNAME to 4ea52815cdafd94.vercel-dns-017.com
```

---

## What Happens After DNS Is Correct?

1. ✅ Vercel will detect correct DNS (5-30 minutes)
2. ✅ Vercel automatically issues SSL certificate
3. ✅ "Not Secure" warning disappears
4. ✅ Both http:// and https:// work (http redirects to https)
5. ✅ Both osecaadegas.pt and www.osecaadegas.pt work

---

## Still Need Help?

If you're stuck:
1. **Take a screenshot** of your one.com DNS settings page
2. **Take a screenshot** of the Vercel domains page showing the error
3. Contact one.com support and say: "I need to point my domain to Vercel using an A record and CNAME"
4. Or share screenshots and I can help identify the issue

Expected timeline: **10-30 minutes** for DNS to propagate after saving changes.
