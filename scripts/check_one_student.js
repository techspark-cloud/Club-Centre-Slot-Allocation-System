const fs = require('fs');
const env = fs.readFileSync('.env.local', 'utf8').split('\n').reduce((acc, line) => {
  const [key, ...val] = line.split('=');
  if (key && val.length) acc[key.trim()] = val.join('=').trim().replace(/^['"]|['"]$/g, '');
  return acc;
}, {});

const { createClient } = require('@supabase/supabase-js');
const supabase = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);

async function checkStudent() {
  const { data: allocs } = await supabase
    .from('allocations')
    .select('*, slot:slots(*, club:clubs(name), centre:centres(name))')
    .eq('student_id', '1994e099-62e6-4a82-a836-e3f81c9017ce');

  console.log('Allocs for Mohammed Asif:');
  allocs.forEach(a => {
    console.log(`- Day: ${a.slot.day} | ${a.slot.start_time}-${a.slot.end_time} | Session: ${a.slot.session} | Type: ${a.slot.club_id ? 'CLUB: ' + a.slot.club?.name : 'CENTRE: ' + a.slot.centre?.name}`);
  });
}

checkStudent();
