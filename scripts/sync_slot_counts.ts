import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';

const envPath = path.resolve(process.cwd(), '.env.local');
let envUrl = '';
let envKey = '';

if (fs.existsSync(envPath)) {
  const envFile = fs.readFileSync(envPath, 'utf8');
  envUrl = envFile.match(/NEXT_PUBLIC_SUPABASE_URL="?(.*?)"?(?:\n|$)/)?.[1] || '';
  envKey = envFile.match(/SUPABASE_SERVICE_ROLE_KEY="?(.*?)"?(?:\n|$)/)?.[1] || '';
}

const supabase = createClient(envUrl, envKey);

async function syncSlotCounts() {
  console.log("Syncing slot allocated_counts...");
  
  // Fetch all slots
  const { data: slots, error: slotsError } = await supabase.from('slots').select('id, allocated_count');
  if (slotsError) {
    console.error("Error fetching slots:", slotsError);
    return;
  }
  
  let syncedCount = 0;

  for (const slot of slots) {
    // Count actual allocations for this slot
    const { count, error: countError } = await supabase
      .from('allocations')
      .select('*', { count: 'exact', head: true })
      .eq('slot_id', slot.id);
      
    if (countError) {
      console.error(`Error counting allocations for slot ${slot.id}:`, countError);
      continue;
    }
    
    // If the database count differs from the actual count, update it
    if (slot.allocated_count !== count) {
      console.log(`Slot ${slot.id} count mismatch: DB says ${slot.allocated_count}, actual is ${count}. Fixing...`);
      const { error: updateError } = await supabase
        .from('slots')
        .update({ allocated_count: count })
        .eq('id', slot.id);
        
      if (updateError) {
        console.error(`Failed to update slot ${slot.id}:`, updateError);
      } else {
        syncedCount++;
      }
    }
  }
  
  console.log(`Done! Fixed ${syncedCount} out-of-sync slots.`);
}

syncSlotCounts();
