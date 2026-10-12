const fs = require('fs');
const env = fs.readFileSync('.env.local', 'utf8').split('\n').reduce((acc, line) => {
  const [key, ...val] = line.split('=');
  if (key && val.length) acc[key.trim()] = val.join('=').trim().replace(/^['"]|['"]$/g, '');
  return acc;
}, {});

const { createClient } = require('@supabase/supabase-js');
const supabase = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);

async function checkRealSemi() {
  const { data: semiCentre } = await supabase.from('centres').select('id, name').eq('name', 'Centre for Semiconductor Design').single();
  const { data: semiSlots } = await supabase.from('slots').select('id, day, session, allocated_count, capacity').eq('centre_id', semiCentre.id);
  console.log('Semiconductor slots in DB:');
  console.log(semiSlots);

  const semiIds = semiSlots.map(s => s.id);
  const { data: allocs } = await supabase.from('allocations').select('id, student:students(course, section)').in('slot_id', semiIds);

  const courseCounts = {};
  allocs?.forEach(a => {
    const c = a.student?.course || 'Unknown';
    courseCounts[c] = (courseCounts[c] || 0) + 1;
  });

  console.log('\nExact semiconductor allocations by course:');
  console.log(courseCounts);
}

checkRealSemi();
