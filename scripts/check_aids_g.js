const fs = require('fs');
const env = fs.readFileSync('.env.local', 'utf8').split('\n').reduce((acc, line) => {
  const [key, ...val] = line.split('=');
  if (key && val.length) acc[key.trim()] = val.join('=').trim().replace(/^['"]|['"]$/g, '');
  return acc;
}, {});

const { createClient } = require('@supabase/supabase-js');
const supabase = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);

async function checkSecG() {
  const { data: st } = await supabase.from('students').select('*').ilike('course', '%Data Science%').eq('section', 'G').limit(5);
  console.log('AIDS Sec G students count/sample:', st?.length, st?.[0]?.allowed_day, st?.[0]?.activity_session);

  const { data: rules } = await supabase.from('section_booking_rules').select('*').ilike('course', '%Data Science%').eq('section', 'G');
  console.log('Rules for AIDS Sec G:', rules);

  // Check what AIDS Sec G students have currently booked in allocations!
  if (st && st.length > 0) {
    const { data: allocs } = await supabase.from('allocations').select('slot:slots(*, club:clubs(name), centre:centres(name))').eq('student_id', st[0].id);
    console.log(`Current Bookings for ${st[0].name}:`);
    allocs?.forEach(a => {
      const type = a.slot.club ? `CLUB: ${a.slot.club.name}` : `CENTRE: ${a.slot.centre?.name}`;
      console.log(`  - ${a.slot.day} (${a.slot.start_time.slice(0,5)}-${a.slot.end_time.slice(0,5)}): ${type}`);
    });
  }
}

checkSecG();
