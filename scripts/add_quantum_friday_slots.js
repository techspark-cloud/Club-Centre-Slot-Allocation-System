const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

const envPath = path.resolve(process.cwd(), '.env.local');
const envFile = fs.readFileSync(envPath, 'utf8');

const envUrl = envFile.split('\n').find(l => l.startsWith('NEXT_PUBLIC_SUPABASE_URL='))?.split('=')[1]?.trim().replace(/^["']|["']$/g, '');
const envKey = envFile.split('\n').find(l => l.startsWith('SUPABASE_SERVICE_ROLE_KEY='))?.split('=')[1]?.trim().replace(/^["']|["']$/g, '');

const supabase = createClient(envUrl, envKey);

async function addFridaySlots() {
  console.log('--- Adding Friday Slots for Quantum Centre ---');

  const { data: centre, error: centreErr } = await supabase
    .from('centres')
    .select('id, name')
    .ilike('name', '%Quantum%')
    .single();

  if (centreErr || !centre) {
    console.error('Quantum centre not found:', centreErr);
    return;
  }

  const centreId = centre.id;
  const venue = 'Green Building Ground floor';
  const capacity = 30;

  const sessions = [
    { name: 'FORENOON', start_time: '09:40:00', end_time: '10:30:00' },
    { name: 'AFTERNOON', start_time: '13:10:00', end_time: '14:00:00' }
  ];

  for (const session of sessions) {
    const { data: existingSlot } = await supabase
      .from('slots')
      .select('*')
      .eq('centre_id', centreId)
      .eq('day', 'FRIDAY')
      .eq('session', session.name)
      .maybeSingle();

    if (existingSlot) {
      console.log(`Slot already exists for FRIDAY ${session.name}, updating...`);
      const { data: updated, error: updateErr } = await supabase
        .from('slots')
        .update({
          venue: venue,
          capacity: capacity,
          start_time: session.start_time,
          end_time: session.end_time,
          status: 'ACTIVE'
        })
        .eq('id', existingSlot.id)
        .select()
        .single();

      if (updateErr) console.error(`Error updating slot for FRIDAY ${session.name}:`, updateErr);
      else console.log(`🔄 Updated slot for FRIDAY ${session.name}:`, updated);
    } else {
      const { data: newSlot, error: insertErr } = await supabase
        .from('slots')
        .insert({
          centre_id: centreId,
          club_id: null,
          day: 'FRIDAY',
          session: session.name,
          venue: venue,
          capacity: capacity,
          allocated_count: 0,
          start_time: session.start_time,
          end_time: session.end_time,
          status: 'ACTIVE'
        })
        .select()
        .single();

      if (insertErr) console.error(`❌ Error inserting slot for FRIDAY ${session.name}:`, insertErr);
      else console.log(`✅ Created new slot for FRIDAY ${session.name}:`, newSlot);
    }
  }

  // Print all Quantum Centre slots now
  const { data: allQuantumSlots } = await supabase
    .from('slots')
    .select('id, day, session, venue, capacity, allocated_count, status')
    .eq('centre_id', centreId)
    .order('day');

  console.log('\n--- All Quantum Centre Slots ---');
  console.table(allQuantumSlots);
}

addFridaySlots();
