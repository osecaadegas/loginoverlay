# Daily Wheel Setup Guide

## Overview
The Daily Wheel is a gamification feature that allows users to spin a wheel once every 24 hours to win StreamElements points or other prizes.

## Features
- ✅ Customizable prizes with different probabilities
- ✅ 24-hour cooldown per user
- ✅ StreamElements points integration
- ✅ Admin management panel
- ✅ Real-time spinning animation with sound effects
- ✅ Mobile responsive design
- ✅ Confetti celebration on wins

## Database Setup

### 1. Run the Migration
Go to your Supabase SQL Editor and run:
```
migrations/create_daily_wheel_system.sql
```

This creates:
- `daily_wheel_prizes` table (prize configuration)
- `daily_wheel_spins` table (user spin history)
- RLS policies for security
- Helper functions for cooldown checking
- 8 default prizes

## StreamElements Integration Setup

### 2. Get StreamElements Credentials

1. **Get JWT Token:**
   - Go to https://streamelements.com/dashboard/account/channels
   - Click "Show secrets"
   - Copy your JWT Token

2. **Get Channel ID:**
   - Same page, copy your Channel ID
   - Or find it in the URL: `https://streamelements.com/dashboard/YOUR_CHANNEL_ID/...`

### 3. Configure Environment Variables

Add these to your Vercel environment variables:

```
STREAMELEMENTS_JWT_TOKEN=your_jwt_token_here
STREAMELEMENTS_CHANNEL_ID=your_channel_id_here
```

**How to add in Vercel:**
1. Go to your project on Vercel
2. Settings → Environment Variables
3. Add both variables
4. Redeploy your project

### 4. Configure User SE Usernames

Users need their StreamElements username set in their profile to receive points:

1. Users go to Settings → Profile
2. Enter their StreamElements username
3. Save

## Admin Panel Usage

### Managing Prizes

1. Go to **Admin Panel → Daily Wheel** tab

2. **Add Prize:**
   - Click "+ Add Prize"
   - Fill in:
     - **Label:** Display name (e.g., "500 Points")
     - **Icon:** Emoji to display (e.g., 💰)
     - **Background Color:** Hex color for segment (e.g., #1a1a1a)
     - **Text Color:** Text color on segment (e.g., #ffffff)
     - **SE Points:** Points to award (0 = nothing)
     - **Probability:** Weight (higher = more common)
     - **Display Order:** Position on wheel (0-7)
     - **Active:** Check to enable

3. **Edit Prize:** Click ✏️ Edit button

4. **Delete Prize:** Click 🗑️ Delete button

5. **Toggle Active:** Click Active/Inactive button

### Prize Probability System

Prizes are selected based on **probability weights**. 

Example:
- Prize A: Probability = 20
- Prize B: Probability = 10
- Prize C: Probability = 5

**Total weight** = 35

**Chances:**
- Prize A: 20/35 = 57% chance
- Prize B: 10/35 = 29% chance
- Prize C: 5/35 = 14% chance

**Tips:**
- Higher probability = more common
- Use 0 SE Points for "nothing" prizes
- Balance common prizes (high probability) with rare jackpots (low probability)
- Recommended setup: 50-60% nothing/low value, 30-40% medium, 10-20% high value

### Default Prizes
The migration includes 8 default prizes:
1. 500 Points (15% chance)
2. FREE SPIN (5% chance) - doesn't reset cooldown yet
3. 100 Points (20% chance)
4. 1,000 Points (10% chance)
5. NOTHING (25% chance)
6. JACKPOT 5,000 Points (2% chance)
7. TRY AGAIN (18% chance)
8. 250 Points (5% chance)

## User Experience

### How Users Spin

1. Navigate to **Stream Page** (Home)
2. Scroll down to "Daily Wheel" section
3. Click **"SPIN NOW"** button
4. Watch the wheel spin (5 seconds)
5. See win modal with prize
6. If prize has SE Points, they're automatically awarded
7. Wait 24 hours for next spin

### Features
- **Sound Effects:** Whoosh on spin, tick on each segment, celebration on win
- **Visual Feedback:** LED lights, pointer wiggle, confetti on win
- **Countdown Timer:** Shows when next spin is available
- **Mobile Responsive:** Works on all devices

## Troubleshooting

### Points Not Awarded

**Check:**
1. User has `streamelements_username` set in profile
2. Username matches their SE username exactly
3. Environment variables are set in Vercel
4. JWT token is valid (they expire)
5. Check browser console for API errors

**Test manually:**
```bash
curl -X POST https://your-app.vercel.app/api/streamelements/award-points \
  -H "Content-Type: application/json" \
  -d '{"username": "test_user", "points": 100}'
```

### Wheel Not Showing

**Check:**
1. Database migration was run successfully
2. At least one prize is marked as `is_active = true`
3. User is logged in (wheel requires authentication)
4. Check browser console for errors

### Cooldown Not Working

**Check:**
1. `can_user_spin_today()` function exists in database
2. User's timezone is correct
3. Spins are being recorded in `daily_wheel_spins` table

## Database Queries

### View All Spins
```sql
SELECT 
  u.email,
  dws.prize_label,
  dws.se_points_won,
  dws.spin_date
FROM daily_wheel_spins dws
JOIN auth.users u ON u.id = dws.user_id
ORDER BY dws.spin_date DESC
LIMIT 50;
```

### Total Points Awarded
```sql
SELECT SUM(se_points_won) as total_points
FROM daily_wheel_spins;
```

### User Spin History
```sql
SELECT 
  prize_label,
  se_points_won,
  spin_date
FROM daily_wheel_spins
WHERE user_id = 'user_id_here'
ORDER BY spin_date DESC;
```

### Prize Win Statistics
```sql
SELECT 
  prize_label,
  COUNT(*) as times_won,
  SUM(se_points_won) as total_points
FROM daily_wheel_spins
GROUP BY prize_label
ORDER BY times_won DESC;
```

## Customization

### Change Wheel Size
Edit `DailyWheel.css`:
```css
.wheel-container-inner {
  width: 400px;  /* Change this */
  height: 400px; /* And this */
}
```

### Change Spin Duration
Edit `DailyWheel.jsx`:
```javascript
const duration = 5000; // Change from 5000ms to desired value
```

### Change Cooldown Period
Edit `create_daily_wheel_system.sql`:
```sql
-- Change from 24 hours to desired interval
RETURN (NOW() - last_spin_time) >= INTERVAL '24 hours';
```

## Security Notes

- ✅ RLS policies protect user data
- ✅ Users can only spin once per 24 hours
- ✅ Only admins can modify prizes
- ✅ API endpoint validates requests
- ✅ JWT token stored securely in environment variables
- ⚠️ Never expose JWT token in client-side code

## Support

If you encounter issues:
1. Check Vercel deployment logs
2. Check browser console for errors
3. Verify database migration ran successfully
4. Test StreamElements API manually
5. Check environment variables are set correctly

## Next Steps

1. Run `migrations/create_daily_wheel_system.sql` in Supabase
2. Add environment variables to Vercel
3. Test the wheel on your site
4. Customize prizes in Admin Panel
5. Set your StreamElements username in profile
6. Spin and win! 🎉
