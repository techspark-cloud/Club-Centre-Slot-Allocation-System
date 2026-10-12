const fs = require('fs');
const env = fs.readFileSync('.env.local', 'utf8').split('\n').reduce((acc, line) => {
  const [key, ...val] = line.split('=');
  if (key && val.length) acc[key.trim()] = val.join('=').trim().replace(/^['"]|['"]$/g, '');
  return acc;
}, {});

const { createClient } = require('@supabase/supabase-js');
const supabase = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);

async function check() {
  // 1. Semiconductor Bookings breakdown by department
  const { data: semiSlots } = await supabase.from('slots').select('id, day, start_time, capacity, allocated_count, centre:centres(name)').eq('centre.name', 'Centre for Semiconductor Design');
  
  // Fetch all allocations for Semiconductor
  const { data: semiCentre } = await supabase.from('centres').select('id, name').eq('name', 'Centre for Semiconductor Design').single();
  const { data: semiSlotsList } = await supabase.from('slots').select('id').eq('centre_id', semiCentre.id);
  const semiSlotIds = semiSlotsList.map(s => s.id);

  const { data: semiAllocs } = await supabase
    .from('allocations')
    .select('id, student:students(course, section)')
    .in('slot_id', semiSlotIds);

  const semiDeptCounts = {};
  semiAllocs?.forEach(a => {
    const c = a.student?.course || 'Unknown';
    semiDeptCounts[c] = (semiDeptCounts[c] || 0) + 1;
  });

  console.log('=== SEMICONDUCTOR ALLOCATIONS BY DEPARTMENT ===');
  console.log(`Total bookings in Semiconductor: ${semiAllocs?.length}`);
  for (const [course, count] of Object.entries(semiDeptCounts)) {
    console.log(`  - ${course}: ${count} students`);
  }

  // 2. Check total allocations overall by type
  const { data: allCentreSlots } = await supabase.from('slots').select('id').not('centre_id', 'is', null);
  const centreSlotIds = allCentreSlots.map(s => s.id);
  
  const { count: totalCentreAllocs } = await supabase.from('allocations').select('*', { count: 'exact', head: true }).in('slot_id', centreSlotIds);
  console.log(`\n=== TOTAL CENTRE ALLOCATIONS IN SYSTEM: ${totalCentreAllocs} ===`);

  // 3. Check allocation dates (when were they booked?)
  const { data: sampleDates } = await supabase.from('allocations').select('created_at').order('created_at', { ascending: false }).limit(5);
  console.log('Recent allocation timestamps:', sampleDates?.map(d => d.created_at));
  const { data: earliestDates } = await supabase.from('allocations').select('created_at').order('created_at', { ascending: true }).limit(5);
  console.log('Earliest allocation timestamps:', earliestDates?.map(d => d.created_at));
}

check();
