/**
 * Script to upload slot database to Supabase
 * Run this script with: node scripts/uploadSlots.js
 */

import { createClient } from '@supabase/supabase-js';
import { slotDatabase } from '../src/data/slotDatabase.js';
import * as dotenv from 'dotenv';

// Load environment variables
dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL;
// Use service role key for admin operations (bypasses RLS)
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Missing Supabase credentials in .env file');
  console.error('Please ensure VITE_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are set');
  process.exit(1);
}

if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
  console.warn('⚠️  Warning: Using ANON key. If upload fails due to RLS, add SUPABASE_SERVICE_ROLE_KEY to .env');
  console.warn('   Find it in: Supabase Dashboard → Settings → API → service_role key');
  console.log('');
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function uploadSlots() {
  console.log(`🚀 Starting upload of ${slotDatabase.length} slots to Supabase...`);
  console.log('');

  // Batch size for uploads (Supabase can handle large batches, but we'll use 100 for safety)
  const BATCH_SIZE = 100;
  const batches = [];
  
  for (let i = 0; i < slotDatabase.length; i += BATCH_SIZE) {
    batches.push(slotDatabase.slice(i, i + BATCH_SIZE));
  }

  let totalSuccess = 0;
  let totalFailed = 0;

  for (let i = 0; i < batches.length; i++) {
    const batch = batches[i];
    console.log(`📦 Processing batch ${i + 1}/${batches.length} (${batch.length} slots)...`);

    const { data, error } = await supabase
      .from('slots')
      .upsert(batch, { 
        onConflict: 'name',
        ignoreDuplicates: false 
      });

    if (error) {
      console.error(`❌ Error uploading batch ${i + 1}:`, error.message);
      totalFailed += batch.length;
    } else {
      console.log(`✅ Batch ${i + 1} uploaded successfully`);
      totalSuccess += batch.length;
    }
  }

  console.log('');
  console.log('═══════════════════════════════════════');
  console.log('📊 Upload Summary:');
  console.log(`   ✅ Successful: ${totalSuccess}`);
  console.log(`   ❌ Failed: ${totalFailed}`);
  console.log(`   📋 Total: ${slotDatabase.length}`);
  console.log('═══════════════════════════════════════');

  // Verify the count in the database
  console.log('');
  console.log('🔍 Verifying data in Supabase...');
  const { count, error: countError } = await supabase
    .from('slots')
    .select('*', { count: 'exact', head: true });

  if (countError) {
    console.error('❌ Error counting slots:', countError.message);
  } else {
    console.log(`✅ Total slots in database: ${count}`);
  }

  // Show some sample data
  const { data: sampleData, error: sampleError } = await supabase
    .from('slots')
    .select('name, provider')
    .limit(5);

  if (!sampleError && sampleData) {
    console.log('');
    console.log('📝 Sample data from database:');
    sampleData.forEach((slot, index) => {
      console.log(`   ${index + 1}. ${slot.name} (${slot.provider})`);
    });
  }

  console.log('');
  console.log('🎉 Upload complete!');
}

// Run the upload
uploadSlots().catch(error => {
  console.error('💥 Fatal error:', error);
  process.exit(1);
});
