require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');
const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function inspectSlots() {
  const { data: slots } = await supabase
    .from('slots')
    .select('id, day, session, capacity, allocated_count, centre_id, club_id, centre:centres(name), club:clubs(name)')
    .eq('status', 'ACTIVE');

  const overAllocated = slots.filter(s => s.allocated_count > s.capacity);
  console.log('Slots where allocated_count > capacity:', overAllocated.length);
  overAllocated.forEach(s => {
    console.log(`${s.day} [${s.session}] ${s.club?.name || s.centre?.name}: allocated ${s.allocated_count} > capacity ${s.capacity}`);
  });
}

inspectSlots();
