import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://kjestbshetpglycmmrem.supabase.co';
const SERVICE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtqZXN0YnNoZXRwZ2x5Y21tcmVtIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4NzA2MjIyNiwiZXhwIjoyMTAyNjM4MjI2fQ.tvbYzoSBKhJZgbBEwJSs2MhBRy4NAVtkKtyACdOlWmE';

const supabase = createClient(SUPABASE_URL, SERVICE_KEY);

async function run() {
  console.log('🔄 Fetching all slots...');
  
  // 1. Fetch all slots with their club/centre details
  const { data: slots, error: fetchErr } = await supabase
    .from('slots')
    .select('id, club:clubs(name), centre:centres(name)');

  if (fetchErr) {
    console.error('❌ Error fetching slots:', fetchErr.message);
    return;
  }
  
  if (!slots || slots.length === 0) {
    console.log('⚠️ No slots found in the database.');
    return;
  }

  let updatedTo50 = 0;
  let updatedTo0 = 0;

  console.log(`📋 Found ${slots.length} slots. Updating capacities...`);

  for (const slot of slots) {
    const isClub = !!slot.club;
    const entityName = isClub ? (slot.club as any).name : (slot.centre as any)?.name;
    const isSports = entityName && entityName.toLowerCase().includes('sport');
    
    const newCapacity = isSports ? 0 : 50;

    const { error: upErr } = await supabase
      .from('slots')
      .update({ capacity: newCapacity })
      .eq('id', slot.id);

    if (upErr) {
      console.error(`❌ Failed to update slot ${slot.id}:`, upErr.message);
    } else {
      if (newCapacity === 0) updatedTo0++;
      else updatedTo50++;
    }
  }

  console.log(`\n✅ Successfully updated ${updatedTo50} slots to 50 capacity.`);
  console.log(`✅ Successfully updated ${updatedTo0} sports slots to 0 capacity.`);
}

run().catch(console.error);
