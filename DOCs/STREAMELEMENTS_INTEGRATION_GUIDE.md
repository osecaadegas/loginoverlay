# StreamElements Points Integration Setup Guide

## 🎯 What This Does

Users can link their StreamElements account and redeem loyalty points for rewards on your website, like:
- Premium access (7, 30, or 90 days)
- Special features
- Custom rewards you configure

---

## 📋 Step 1: Run Database Setup

1. Go to your **Supabase Dashboard**: https://supabase.com/dashboard
2. Select your project
3. Go to **SQL Editor** (in left sidebar)
4. Click **"New Query"**
5. Copy the entire contents of `STREAMELEMENTS_SETUP.sql`
6. Paste it into the SQL editor
7. Click **"Run"**

This creates:
- `streamelements_connections` table (stores user SE accounts)
- `redemption_items` table (rewards users can redeem)
- `point_redemptions` table (tracks all redemptions)
- Default redemption items (7/30/90 day premium access)

---

## 🔧 Step 2: Get StreamElements Credentials

### For YOU (the streamer):

1. Go to **StreamElements Dashboard**: https://streamelements.com/dashboard
2. Click your profile → **Account settings**
3. Find **"Show secrets"** button and click it
4. You'll need two things:
   - **Channel ID**: Found in your dashboard URL or account settings
   - **JWT Token**: The long secret token (keep this private!)

### For YOUR USERS:

Users will need the same credentials from their own StreamElements account to link it to your site.

**Important**: Each user uses **your** Channel ID (since they're part of your stream's loyalty system) but their own JWT token for authentication.

---

## 🎮 Step 3: How Users Link Their Account

1. User logs into your website
2. Clicks **"Points Store"** in the sidebar menu
3. Clicks **"Connect StreamElements"**
4. Enters:
   - **Channel ID**: Your (the streamer's) SE Channel ID
   - **JWT Token**: Their personal SE JWT token
   - **Username** (optional): Their SE username
5. Clicks **"Connect Account"**

Once connected, they can:
- View their current loyalty points
- Browse available redemptions
- Redeem points for rewards

---

## 🎁 Step 4: Managing Redemption Items (Admin)

### View Current Redemptions

```sql
SELECT * FROM redemption_items WHERE is_active = true;
```

### Add New Redemption Item

```sql
INSERT INTO redemption_items (name, description, point_cost, reward_type, reward_value)
VALUES (
  'Premium Access (14 Days)',
  'Get premium features for 2 weeks',
  8000,
  'premium_duration',
  '{"duration_days": 14, "reward_type": "premium_duration"}'
);
```

### Update Point Cost

```sql
UPDATE redemption_items
SET point_cost = 12000
WHERE name = 'Premium Access (30 Days)';
```

### Disable a Redemption

```sql
UPDATE redemption_items
SET is_active = false
WHERE name = 'Premium Access (7 Days)';
```

---

## 🔍 Step 5: Monitoring Redemptions

### View All Redemptions

```sql
SELECT 
  pr.id,
  u.email as user_email,
  ri.name as item_name,
  pr.points_spent,
  pr.redeemed_at,
  pr.processed
FROM point_redemptions pr
JOIN auth.users u ON pr.user_id = u.id
JOIN redemption_items ri ON pr.redemption_id = ri.id
ORDER BY pr.redeemed_at DESC;
```

### Check User's Redemption History

```sql
SELECT 
  ri.name,
  pr.points_spent,
  pr.redeemed_at,
  pr.processed
FROM point_redemptions pr
JOIN redemption_items ri ON pr.redemption_id = ri.id
WHERE pr.user_id = 'USER_ID_HERE'
ORDER BY pr.redeemed_at DESC;
```

---

## ⚙️ How It Works

### 1. User Links Account
- User provides their SE Channel ID and JWT token
- System verifies credentials by calling SE API
- Connection stored in database

### 2. Points Display
- Frontend calls SE API with user's JWT token
- Fetches current points balance
- Displays on Points Store page

### 3. Redemption Process
1. User clicks "Redeem" on an item
2. System checks if they have enough points
3. SE API deducts points from their account
4. Database records the redemption
5. **Auto-processing trigger** immediately applies premium role
6. User receives confirmation

### 4. Auto-Processing
The database trigger automatically:
- Updates user's role to "premium"
- Sets expiration date based on redemption (7/30/90 days)
- Marks redemption as processed

---

## 🔐 Security Notes

### JWT Tokens
- Stored encrypted in database
- Only accessible by the user who owns them
- Used server-side only (never exposed to other users)
- Can be revoked by unlinking account

### RLS Policies
- Users can only see/manage their own SE connection
- Users can only see their own redemptions
- Admins can view all redemptions for monitoring
- Redemption items are public (read-only for users)

---

## 🎨 Customization Ideas

### Add Custom Rewards

```sql
-- Example: Custom Discord Role
INSERT INTO redemption_items (name, description, point_cost, reward_type, reward_value)
VALUES (
  'VIP Discord Role',
  'Get exclusive VIP role in Discord server',
  10000,
  'custom',
  '{"reward_type": "discord_role", "role_id": "DISCORD_ROLE_ID"}'
);

-- Example: Shoutout on Stream
INSERT INTO redemption_items (name, description, point_cost, reward_type, reward_value)
VALUES (
  'Stream Shoutout',
  'Get a shoutout during next stream',
  3000,
  'custom',
  '{"reward_type": "shoutout"}'
);
```

For custom rewards, you'll need to add manual processing or create additional triggers.

---

## 📊 StreamElements API Reference

### Get User Points
```
GET https://api.streamelements.com/kappa/v2/points/{channelId}/{userId}
Headers: Authorization: Bearer {JWT_TOKEN}
```

### Update User Points
```
PUT https://api.streamelements.com/kappa/v2/points/{channelId}/{userId}/{amount}
Headers: Authorization: Bearer {JWT_TOKEN}
```

Use negative numbers to deduct points: `/points/{channelId}/{userId}/-1000`

---

## 🐛 Troubleshooting

### "Invalid StreamElements credentials"
- Double-check Channel ID and JWT Token
- Make sure JWT Token hasn't expired
- Verify StreamElements account is active

### "Insufficient points"
- User doesn't have enough points for redemption
- Check points balance refreshed correctly
- Verify SE API is responding

### Points not deducting
- Check JWT token is valid
- Verify SE API endpoint is accessible
- Check database logs for errors

### Redemption not processing
- Check `process_premium_redemption()` function
- Verify user exists in `user_roles` table
- Check database trigger is enabled

---

## ✅ Testing Checklist

- [ ] Run STREAMELEMENTS_SETUP.sql in Supabase
- [ ] Get your StreamElements Channel ID and JWT Token
- [ ] Link your own SE account on the website
- [ ] Verify points display correctly
- [ ] Try redeeming a test item
- [ ] Confirm premium role was applied
- [ ] Check expiration date is correct
- [ ] Test unlinking account
- [ ] Verify RLS policies work (users can't see others' connections)

---

## 🎉 You're Done!

Users can now:
✅ Link their StreamElements account
✅ View their loyalty points balance
✅ Redeem points for premium access and rewards
✅ Support your stream while getting perks!

All redemptions are automatic and logged for your review.
