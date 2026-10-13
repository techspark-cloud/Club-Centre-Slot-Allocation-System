require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');
const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function checkCapacities() {
  const { data: slots } = await supabase
    .from('slots')
    .select('id, day, session, capacity, allocated_count, centre_id, club_id, centre:centres(name), club:clubs(name)')
    .eq('status', 'ACTIVE');

  // Let's see: for all slots where allocated_count >= capacity:
  const tightSlots = slots.filter(s => s.allocated_count >= s.capacity);
  console.log('Slots where allocated_count >= capacity:', tightSlots.length);
  tightSlots.forEach(s => {
    console.log(`${s.day} [${s.session}] ${s.club?.name || s.centre?.name}: count=${s.allocated_count}, cap=${s.capacity}`);
  });
}

checkCapacities();
