const fs = require('fs');
const env = fs.readFileSync('.env.local', 'utf8').split('\n').reduce((acc, line) => {
  const [key, ...val] = line.split('=');
  if (key && val.length) acc[key.trim()] = val.join('=').trim().replace(/^['"]|['"]$/g, '');
  return acc;
}, {});

const { createClient } = require('@supabase/supabase-js');
const supabase = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);

async function testFetch() {
  const { data: students, error: sErr } = await supabase.from('students').select('*').limit(5);
  console.log('Students:', sErr || students?.length);

  const { data: rules, error: rErr } = await supabase.from('section_booking_rules').select('*').limit(5);
  console.log('Rules:', rErr || rules?.length);

  const { data: slots, error: slErr } = await supabase.from('slots').select('id, day, session, start_time, end_time, capacity, allocated_count, centre_id, centre:centres(name)').not('centre_id', 'is', null).limit(5);
  console.log('Slots:', slErr || slots?.length);
}

testFetch();
