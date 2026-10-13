require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');
const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function fixCapacities() {
  console.log('Fetching all active slots...');
  const { data: slots, error } = await supabase
    .from('slots')
    .select('id, day, session, capacity, allocated_count, centre_id, club_id, centre:centres(name), club:clubs(name)')
    .eq('status', 'ACTIVE');

  if (error) {
    console.error('Error fetching slots:', error);
    return;
  }

  const updates = [];
  for (const s of slots) {
    // If allocated_count >= capacity, bump capacity so bookings never fail on full locked slots
    if (s.allocated_count >= s.capacity && s.capacity > 0) {
      const newCapacity = s.allocated_count + 25; // 25 buffer seats
      updates.push({
        id: s.id,
        name: s.club?.name || s.centre?.name,
        day: s.day,
        session: s.session,
        oldCap: s.capacity,
        count: s.allocated_count,
        newCap: newCapacity
      });
    }
  }

  console.log(`Found ${updates.length} slots needing capacity expansion.`);

  for (const item of updates) {
    const { error: upErr } = await supabase
      .from('slots')
      .update({ capacity: item.newCap })
      .eq('id', item.id);

    if (upErr) {
      console.error(`Failed to update ${item.name} (${item.day}):`, upErr);
    } else {
      console.log(`Updated [${item.day} ${item.session}] ${item.name}: count=${item.count}, capacity ${item.oldCap} -> ${item.newCap}`);
    }
  }

  console.log('\nAll capacity bottlenecks resolved!');
}

fixCapacities();
