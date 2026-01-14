import { createClient } from '@supabase/supabase-js';

// Auto-draw winners for expired giveaways
export default async function handler(req, res) {
  // Allow manual trigger or cron job
  if (req.method !== 'POST' && req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const supabase = createClient(
      process.env.VITE_SUPABASE_URL,
      process.env.VITE_SUPABASE_SERVICE_ROLE_KEY
    );

    // Find expired giveaways that haven't drawn winners yet
    const { data: expiredGiveaways, error: fetchError } = await supabase
      .from('giveaways')
      .select('id, title, max_winners')
      .eq('is_active', true)
      .eq('winners_drawn', false)
      .lt('ends_at', new Date().toISOString());

    if (fetchError) throw fetchError;

    if (!expiredGiveaways || expiredGiveaways.length === 0) {
      return res.status(200).json({ 
        message: 'No expired giveaways to draw',
        drawn: 0
      });
    }

    const results = [];

    // Draw winners for each expired giveaway
    for (const giveaway of expiredGiveaways) {
      try {
        // Get all entries for this giveaway
        const { data: entries, error: entriesError } = await supabase
          .from('giveaway_entries')
          .select('user_id, tickets_count')
          .eq('giveaway_id', giveaway.id);

        if (entriesError) throw entriesError;

        if (!entries || entries.length === 0) {
          // No entries, mark as drawn anyway
          await supabase
            .from('giveaways')
            .update({
              winners_drawn: true,
              drawn_at: new Date().toISOString(),
              is_active: false
            })
            .eq('id', giveaway.id);

          results.push({
            giveaway_id: giveaway.id,
            title: giveaway.title,
            winners: 0,
            message: 'No entries'
          });
          continue;
        }

        // Create weighted array (users with more tickets have more chances)
        const weightedEntries = [];
        entries.forEach(entry => {
          for (let i = 0; i < entry.tickets_count; i++) {
            weightedEntries.push(entry.user_id);
          }
        });

        // Shuffle and pick winners
        const shuffled = weightedEntries.sort(() => 0.5 - Math.random());
        const uniqueWinners = [...new Set(shuffled)].slice(0, giveaway.max_winners);

        // Insert winners
        const winnersData = uniqueWinners.map(userId => ({
          giveaway_id: giveaway.id,
          user_id: userId
        }));

        const { error: winnersError } = await supabase
          .from('giveaway_winners')
          .insert(winnersData);

        if (winnersError) throw winnersError;

        // Mark giveaway as drawn
        const { error: updateError } = await supabase
          .from('giveaways')
          .update({
            winners_drawn: true,
            drawn_at: new Date().toISOString(),
            is_active: false
          })
          .eq('id', giveaway.id);

        if (updateError) throw updateError;

        results.push({
          giveaway_id: giveaway.id,
          title: giveaway.title,
          winners: uniqueWinners.length,
          message: 'Success'
        });
      } catch (error) {
        console.error(`Error drawing winners for giveaway ${giveaway.id}:`, error);
        results.push({
          giveaway_id: giveaway.id,
          title: giveaway.title,
          error: error.message
        });
      }
    }

    return res.status(200).json({
      message: 'Auto-draw completed',
      drawn: results.length,
      results
    });
  } catch (error) {
    console.error('Error in auto-draw:', error);
    return res.status(500).json({ 
      error: 'Failed to auto-draw winners',
      details: error.message 
    });
  }
}
