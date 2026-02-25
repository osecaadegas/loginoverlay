/**
 * Upload scraped slot data to Supabase
 * 
 * Features:
 * - Reads from scraped_slots.json (or scrape_progress.json for partial results)  
 * - UPSERTs: updates existing slots with new data, inserts new ones
 * - Batch processing with error handling
 * - Dry-run mode to preview changes
 * 
 * Usage:
 *   node scripts/upload_to_supabase.mjs                    # Upload all
 *   node scripts/upload_to_supabase.mjs --dry-run          # Preview only
 *   node scripts/upload_to_supabase.mjs --update-only      # Only update existing slots
 *   node scripts/upload_to_supabase.mjs --new-only         # Only insert new slots
 * 
 * Required: Set SUPABASE_SERVICE_ROLE_KEY in .env file (or pass via environment)
 */

import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import dotenv from 'dotenv';

dotenv.config();

// ---- Config ----
const SUPABASE_URL = process.env.VITE_SUPABASE_URL || 'https://dkfllpjfrhdfvtbltrsy.supabase.co';
const keyArg = process.argv.find(a => a.startsWith('--key='));
const SUPABASE_KEY = (keyArg ? keyArg.split('=')[1] : null)
  || process.env.SUPABASE_SERVICE_ROLE_KEY 
  || process.env.VITE_SUPABASE_ANON_KEY;
const SCRAPED_FILE = 'scripts/scraped_slots.json';
const PROGRESS_FILE = 'scripts/scrape_progress.json';
const BATCH_SIZE = 100;

const DRY_RUN = process.argv.includes('--dry-run');
const UPDATE_ONLY = process.argv.includes('--update-only');
const NEW_ONLY = process.argv.includes('--new-only');

if (!SUPABASE_KEY) {
  console.error('Missing Supabase key. Create a .env file with:');
  console.error('  VITE_SUPABASE_URL=https://dkfllpjfrhdfvtbltrsy.supabase.co');
  console.error('  SUPABASE_SERVICE_ROLE_KEY=your_service_role_key_here');
  console.error('\nFind the service role key in: Supabase Dashboard → Settings → API');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

// ---- Load scraped data ----
function loadScrapedSlots() {
  // Try final output first, then fall back to progress file
  let slots = [];
  
  if (fs.existsSync(SCRAPED_FILE)) {
    const data = JSON.parse(fs.readFileSync(SCRAPED_FILE, 'utf-8'));
    slots = data.slots || [];
    console.log(`Loaded ${slots.length} slots from ${SCRAPED_FILE}`);
  } else if (fs.existsSync(PROGRESS_FILE)) {
    const progress = JSON.parse(fs.readFileSync(PROGRESS_FILE, 'utf-8'));
    slots = Object.values(progress).filter(s => !s.error);
    console.log(`Loaded ${slots.length} slots from ${PROGRESS_FILE} (partial data)`);
  } else {
    console.error('No scraped data found. Run scrape_slots.mjs first.');
    process.exit(1);
  }
  
  return slots;
}

// ---- Get existing slots from DB ----
async function getExistingSlots() {
  const allSlots = [];
  let from = 0;
  const pageSize = 1000;
  
  while (true) {
    const { data, error } = await supabase
      .from('slots')
      .select('id, name, provider, image')
      .range(from, from + pageSize - 1);
    
    if (error) {
      console.error('Error fetching existing slots:', error.message);
      process.exit(1);
    }
    
    allSlots.push(...data);
    if (data.length < pageSize) break;
    from += pageSize;
  }
  
  return allSlots;
}

// ---- Normalize name for matching ----
function normalizeName(name) {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '')
    .trim();
}

// ---- Clean slot data ----
function cleanSlotName(name) {
  if (!name) return name;
  return name
    // Remove SEO suffixes: "ᐈ Game Info + Where to play", "ᐈ RTP +", "ᐈ Free demo game!", etc.
    .replace(/\s*[ᐈ|].*/g, '')
    // Remove trailing "Demo &", "Slot", "Game" etc.
    .replace(/\s+(Demo\s*&?|Slot\s*$|Game\s*$)/gi, '')
    // Remove trailing whitespace/punctuation
    .replace(/[\s\-–—,;:!?&]+$/, '')
    .trim();
}

function cleanSlotData(slot) {
  const cleaned = { ...slot };
  
  // Clean name
  cleaned.name = cleanSlotName(cleaned.name);
  
  // Fix RTP: must be between 1 and 100
  if (cleaned.rtp !== null && cleaned.rtp !== undefined) {
    if (cleaned.rtp > 100 && cleaned.rtp < 1000) {
      // Likely missing decimal point: 995 → 99.5, 338 → 33.8
      cleaned.rtp = parseFloat((cleaned.rtp / 10).toFixed(2));
    }
    // Still invalid? Null it out
    if (cleaned.rtp < 1 || cleaned.rtp > 100) {
      cleaned.rtp = null;
    }
  }
  
  // Validate volatility enum
  const validVol = ['low', 'medium', 'high', 'very_high'];
  if (cleaned.volatility && !validVol.includes(cleaned.volatility)) {
    cleaned.volatility = null;
  }
  
  // Validate max_win_multiplier: cap at 500000x, minimum 1x
  if (cleaned.max_win_multiplier !== null && cleaned.max_win_multiplier !== undefined) {
    if (cleaned.max_win_multiplier < 1 || cleaned.max_win_multiplier > 500000) {
      cleaned.max_win_multiplier = null;
    }
  }
  
  return cleaned;
}

// ---- Main ----
async function main() {
  const scrapedSlots = loadScrapedSlots();
  
  // Clean and filter slots  
  const cleanedSlots = scrapedSlots.map(cleanSlotData);
  const validSlots = cleanedSlots.filter(s => 
    s.name && s.name.length > 0 && (s.rtp || s.volatility || s.max_win_multiplier || s.image)
  );
  console.log(`Valid slots with data: ${validSlots.length} (after cleaning)`);
  
  // Fetch existing slots from DB
  console.log('Fetching existing slots from Supabase...');
  const existingSlots = await getExistingSlots();
  console.log(`Existing slots in DB: ${existingSlots.length}`);
  
  // Build lookup maps
  const existingByName = new Map();
  const existingNormalized = new Map();
  for (const slot of existingSlots) {
    existingByName.set(slot.name, slot);
    existingNormalized.set(normalizeName(slot.name), slot);
  }
  
  // Categorize scraped slots: updates vs new inserts
  const updates = [];
  const inserts = [];
  
  for (const slot of validSlots) {
    // Try exact name match first
    let existing = existingByName.get(slot.name);
    
    // Try normalized match
    if (!existing) {
      existing = existingNormalized.get(normalizeName(slot.name));
    }
    
    if (existing) {
      // Build update object - only include fields that have actual data
      const update = { id: existing.id };
      let hasUpdate = false;
      
      if (slot.rtp !== null && slot.rtp !== undefined) { update.rtp = slot.rtp; hasUpdate = true; }
      if (slot.volatility) { update.volatility = slot.volatility; hasUpdate = true; }
      if (slot.max_win_multiplier !== null && slot.max_win_multiplier !== undefined) { update.max_win_multiplier = slot.max_win_multiplier; hasUpdate = true; }
      if (slot.image && !existing.image) { update.image = slot.image; hasUpdate = true; }
      
      if (hasUpdate) updates.push(update);
    } else {
      // New slot - prepare insert object
      if (!NEW_ONLY || true) { // Always prepare inserts, filter later
        inserts.push({
          name: slot.name,
          provider: slot.provider || 'Unknown',
          image: slot.image || null,
          rtp: slot.rtp || null,
          volatility: slot.volatility || null,
          max_win_multiplier: slot.max_win_multiplier || null,
          status: 'active',
        });
      }
    }
  }
  
  console.log(`\n=== Summary ===`);
  console.log(`Updates (existing slots): ${updates.length}`);
  console.log(`New inserts: ${inserts.length}`);
  
  if (DRY_RUN) {
    console.log('\n--- DRY RUN MODE (no changes made) ---');
    console.log('\nSample updates:');
    updates.slice(0, 5).forEach(u => console.log(`  ${JSON.stringify(u)}`));
    console.log('\nSample inserts:');
    inserts.slice(0, 5).forEach(i => console.log(`  ${i.name} | ${i.provider} | RTP:${i.rtp} | Vol:${i.volatility} | MaxWin:${i.max_win_multiplier}`));
    return;
  }
  
  // Process updates
  if (!NEW_ONLY && updates.length > 0) {
    console.log('\nProcessing updates...');
    let updateSuccess = 0;
    let updateFail = 0;
    
    for (let i = 0; i < updates.length; i += BATCH_SIZE) {
      const batch = updates.slice(i, i + BATCH_SIZE);
      
      // Use individual updates for each slot (upsert on id)
      for (const update of batch) {
        const { error } = await supabase
          .from('slots')
          .update(update)
          .eq('id', update.id);
        
        if (error) {
          updateFail++;
        } else {
          updateSuccess++;
        }
      }
      
      console.log(`  Updates: ${updateSuccess + updateFail}/${updates.length} (${updateFail} errors)`);
    }
    
    console.log(`Updates complete: ${updateSuccess} ok, ${updateFail} failed`);
  }
  
  // Process inserts
  if (!UPDATE_ONLY && inserts.length > 0) {
    console.log('\nProcessing inserts...');
    let insertSuccess = 0;
    let insertFail = 0;
    
    for (let i = 0; i < inserts.length; i += BATCH_SIZE) {
      const batch = inserts.slice(i, i + BATCH_SIZE);
      
      const { error } = await supabase
        .from('slots')
        .upsert(batch, { onConflict: 'name', ignoreDuplicates: true });
      
      if (error) {
        console.error(`  Insert batch error: ${error.message}`);
        insertFail += batch.length;
      } else {
        insertSuccess += batch.length;
      }
      
      if ((i + BATCH_SIZE) % 500 === 0 || i + BATCH_SIZE >= inserts.length) {
        console.log(`  Inserts: ${insertSuccess + insertFail}/${inserts.length} (${insertFail} errors)`);
      }
    }
    
    console.log(`Inserts complete: ${insertSuccess} ok, ${insertFail} failed`);
  }
  
  // Verify final count
  const { count } = await supabase
    .from('slots')
    .select('*', { count: 'exact', head: true });
  
  console.log(`\nFinal slot count in DB: ${count}`);
}

main().catch(e => {
  console.error('Fatal error:', e);
  process.exit(1);
});
