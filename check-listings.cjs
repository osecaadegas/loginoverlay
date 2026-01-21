const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  'https://plbmoxqqqbrxbkwhtmca.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBsYm1veHFxcWJyeGJrd2h0bWNhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MzY0MDcxMzgsImV4cCI6MjA1MTk4MzEzOH0.bHXSfnuNdfmSQ4RkPvTXPKXxraLbfYAewQO1aFac1Bk'
);

async function check() {
  // Get all listings (not filtering by status)
  const { data, error } = await supabase
    .from('the_life_market_listings')
    .select('*, item:the_life_items(name)')
    .order('created_at', { ascending: false })
    .limit(10);

  console.log('Error:', error);
  console.log('All Listings:', JSON.stringify(data, null, 2));
  
  // Check the current time
  console.log('\nCurrent time:', new Date().toISOString());
}

check();
