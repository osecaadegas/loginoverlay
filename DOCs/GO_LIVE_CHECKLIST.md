# Go-Live Checklist

Use this checklist before shipping a production build.

## Database

- [ ] Active migrations applied successfully
- [ ] Legacy cleanup migration reviewed and run only if required
- [ ] RLS enabled and validated on all live tables
- [ ] Realtime enabled for overlay tables that need it
- [ ] Test accounts can read and write only what they should

## Authentication and access

- [ ] Twitch OAuth works in development and production
- [ ] Supabase auth callbacks are configured correctly
- [ ] Admin roles and moderation access were verified
- [ ] Service role key is only used server-side

## Overlay and widget runtime

- [ ] Overlay Control Center loads and saves correctly
- [ ] OBS/browser-source overlay renders from a real user token
- [ ] Realtime overlay updates work end to end
- [ ] Widget-specific flows you depend on were tested

## Integrations

- [ ] StreamElements commands and points access were tested if enabled
- [ ] Spotify auth and refresh flow were tested if enabled
- [ ] Offer tracking and analytics events were verified

## Community systems

- [ ] Betting, giveaways, tournaments, slot requests, shoutouts, and daily wheel were tested if you use them
- [ ] Disabled or out-of-scope systems are not linked from your rollout docs
- [ ] Retired The Life and Twitch extension routes, secrets, and admin surfaces are absent from the release

## Security and operations

- [ ] Production environment variables are set correctly
- [ ] Build passes with `npm run build`
- [ ] Logs and error monitoring are available
- [ ] Terms, privacy, and public docs match the actual enabled feature set
- [ ] Backup and rollback plan exists for database changes