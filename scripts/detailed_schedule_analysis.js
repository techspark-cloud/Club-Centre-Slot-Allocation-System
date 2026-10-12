const fs = require('fs');
const env = fs.readFileSync('.env.local', 'utf8').split('\n').reduce((acc, line) => {
  const [key, ...val] = line.split('=');
  if (key && val.length) acc[key.trim()] = val.join('=').trim().replace(/^['"]|['"]$/g, '');
  return acc;
}, {});

const { createClient } = require('@supabase/supabase-js');
const supabase = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);

async function checkDetails() {
  // 1. All distinct course, section, allowed_day, session
  const { data: students } = await supabase.from('students').select('course, section, allowed_day, activity_session');
  const sectionsMap = {};
  students.forEach(s => {
    const key = `${s.course}__Sec_${s.section}`;
    if (!sectionsMap[key]) {
      sectionsMap[key] = {
        course: s.course,
        section: s.section,
        days: new Set(),
        sessions: new Set(),
        count: 0
      };
    }
    sectionsMap[key].days.add(s.allowed_day);
    sectionsMap[key].sessions.add(s.activity_session);
    sectionsMap[key].count++;
  });

  // 2. All section_booking_rules
  const { data: rules } = await supabase.from('section_booking_rules').select('*');

  // 3. All centre slots with days, session, start_time, end_time, capacity, allocated_count
  const { data: centreSlots } = await supabase
    .from('slots')
    .select('id, day, start_time, end_time, session, capacity, allocated_count, centre:centres(id, name)')
    .not('centre_id', 'is', null);

  // Group centre slots by centre name
  const centreSlotsByCentre = {};
  centreSlots.forEach(s => {
    const name = s.centre?.name;
    if (!centreSlotsByCentre[name]) centreSlotsByCentre[name] = [];
    centreSlotsByCentre[name].push(s);
  });

  console.log('--- ALL UNIQUE SECTIONS ---');
  for (const [k, v] of Object.entries(sectionsMap)) {
    console.log(`${k}: count=${v.count}, days=[${Array.from(v.days).join(', ')}], sessions=[${Array.from(v.sessions).join(', ')}]`);
  }

  console.log('\n--- ALL SECTION BOOKING RULES ---');
  rules?.forEach(r => {
    console.log(`${r.course} Sec ${r.section} | Day: ${r.day} | Timings: ${JSON.stringify(r.allowed_timings)}`);
  });

  console.log('\n--- CENTRE DAYS & SESSIONS ---');
  for (const [cName, sList] of Object.entries(centreSlotsByCentre)) {
    const daySessions = sList.map(s => `${s.day} (${s.session || (s.start_time.startsWith('09') ? 'FORENOON' : 'AFTERNOON')}) ${s.start_time.slice(0,5)}-${s.end_time.slice(0,5)} [cap: ${s.capacity}]`);
    console.log(`* ${cName}:`);
    daySessions.forEach(ds => console.log(`    ${ds}`));
  }
}

checkDetails();
