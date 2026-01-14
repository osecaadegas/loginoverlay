# Custom Messages Guide

## Overview
You can now customize the success and failure messages that appear when users interact with The Life game elements (crimes, businesses, and workers).

## Database Setup
Run the migration file `migrations/add_custom_messages_to_thelife.sql` in your Supabase SQL Editor to add the message fields to your database.

## Available Placeholders

### For Crimes (Robberies)
**Success Message:**
- `${reward}` - Amount of money earned
- `${xp}` - Experience points gained
- `${chance}` - Success probability percentage

**Failure Message:**
- `${hp}` - Health points lost
- `${jailTime}` - Minutes in jail
- `${chance}` - Success probability percentage

**Example Messages:**
- Success: `Success! You earned $${reward} and ${xp} XP! (${chance}% chance)`
- Failure: `You failed! Lost ${hp} HP and going to jail for ${jailTime} minutes.`

### For Businesses
**Collection Message:**
- `${reward}` - Amount (cash or item quantity)
- `${unit}` - Unit name (e.g., "grams", "pills")
- `${item}` - Item name (for item rewards)

**Example Messages:**
- Cash: `Collected $${reward}!`
- Items: `Collected ${reward} ${unit} of ${item}!`

### For Workers (Brothel Workers)
**Hire Message:**
- `${name}` - Worker name
- `${reward}` - Income per hour

**Example Message:**
- `Hired ${name}! They generate $${reward} per hour.`

## How to Edit Messages

1. **Access Admin Panel**: Navigate to the Admin Panel in your app
2. **Select Category**: Go to "The Life" tab
3. **Choose Item Type**: Select Crimes, Businesses, or Workers
4. **Edit or Create Item**: Click on an existing item or create a new one
5. **Enter Custom Messages**: Scroll to the "Custom Messages" section
6. **Use Placeholders**: Type your message using the available placeholders
7. **Save**: Click Save to update the item

## Default Messages
If you leave the message fields empty, the system will use default messages that match the original hardcoded behavior.

## Tips
- Keep messages short and clear
- Test different messages to see what resonates with your audience
- Use the placeholders exactly as shown (including the ${} syntax)
- Messages support multiple placeholders - use as many as you need!
