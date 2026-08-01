# Chat Connect 4

Chat Connect 4 is a server-authoritative Better Overlay widget controlled by
Twitch chat. StreamElements points are deducted before play and paid or refunded
through audited point operations.

## Commands

- `!connect4 start 250` starts a match with a 250-point stake.
- `!connect4 join` joins the waiting match for the same stake.
- `!connect4 1` through `!connect4 7` drops a coin in that column.
- `!connect4 drop 1` through `!connect4 drop 7` is the explicit move form.
- `!connect4 reset` cancels the current match and is broadcaster-only.

The widget remains hidden until a match is started. The bot announces the
waiting match, successful join, each turn, final result, refunds, and timeouts.
Each active turn lasts 60 seconds. The bot warns the current player with 10
seconds remaining; failing to play forfeits the match and awards the full pot to
the opponent.

## Browser Source

Use the dedicated transparent browser-source URL:

```text
https://streamerscenter.com/obs/connect-four/{publicOverlayId}/{instanceId}
```

The source contains only the widget and has no configuration UI. It may wake the
server at reminder and expiry thresholds, but the database remains authoritative
for deadlines and outcomes.

## Deployment

1. Apply `migrations/033_chat_connect_four.sql`, followed by
   `migrations/034_connect_four_turn_deadlines.sql`, to the production Supabase
   project.
2. Configure `TWITCH_CLIENT_ID`, `TWITCH_CLIENT_SECRET`, `SUPABASE_URL`, and
   `SUPABASE_SERVICE_ROLE_KEY`.
3. Configure `CONNECT_FOUR_EVENTSUB_SECRET` with a random 10-100 character ASCII
   value.
4. Configure `CONNECT_FOUR_EVENTSUB_CALLBACK_URL` as the public HTTPS URL ending
   in `/api/connect-four-eventsub`. `APP_URL`, `VITE_EBS_URL`, or
   `PUBLIC_SITE_URL` can provide the base URL instead.
5. Confirm the streamer has an active StreamElements connection, then sign out
   and back in with Twitch to grant the chat scopes and create the EventSub
   subscription.
6. Confirm the matching `channel.chat.message` EventSub subscription has status
   `enabled`, uses the expected callback, and has both condition IDs set to the
   streamer's Twitch user ID. Pending, failed, revoked, or stale subscriptions do
   not deliver chat messages.

The OBS/browser-source client reads only `connect_four_public_state`. Twitch
message identity, command decisions, and all point mutations remain server-side.
Starting a new match permanently removes that streamer's previous match and its
command and point-operation records, so only the latest match is retained.
