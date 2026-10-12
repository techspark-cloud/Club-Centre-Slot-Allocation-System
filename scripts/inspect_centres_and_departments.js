const fs = require('fs');
const env = fs.readFileSync('.env.local', 'utf8').split('\n').reduce((acc, line) => {
  const [key, ...val] = line.split('=');
  if (key && val.length) acc[key.trim()] = val.join('=').trim().replace(/^['"]|['"]$/g, '');
  return acc;
}, {});

const { createClient } = require('@supabase/supabase-js');
const supabase = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);

async function inspect() {
  // 1. Centres
  const { data: centres } = await supabase.from('centres').select('id, name');
  console.log('=== CENTRES (' + centres?.length + ') ===');
  centres?.forEach(c => console.log(`ID: ${c.id} | Name: "${c.name}"`));

  // 2. Distinct Courses in Students
  const { data: students } = await supabase.from('students').select('course, section, allowed_day, activity_session');
  const courseSectionCounts = {};
  students?.forEach(s => {
    const key = `${s.course} | Sec: ${s.section} | Day: ${s.allowed_day} | Session: ${s.activity_session}`;
    courseSectionCounts[key] = (courseSectionCounts[key] || 0) + 1;
  });
  console.log('\n=== STUDENTS SUMMARY (Total: ' + students?.length + ') ===');
  for (const [k, count] of Object.entries(courseSectionCounts)) {
    console.log(`${k} -> ${count} students`);
  }

  // 3. Centre Slots
  const { data: slots } = await supabase.from('slots').select('id, day, start_time, end_time, session, capacity, allocated_count, centre_id, centre:centres(name)').not('centre_id', 'is', null);
  console.log('\n=== CENTRE SLOTS COUNT: ' + slots?.length + ' ===');
  // Group by centre and day
  const centreSlotsSummary = {};
  slots?.forEach(s => {
    const cName = s.centre?.name || 'Unknown';
    if (!centreSlotsSummary[cName]) centreSlotsSummary[cName] = [];
    centreSlotsSummary[cName].push(`${s.day} (${s.start_time.substring(0,5)}-${s.end_time.substring(0,5)}) [cap: ${s.allocated_count}/${s.capacity}]`);
  });
  for (const [cName, list] of Object.entries(centreSlotsSummary)) {
    console.log(`\nCentre: ${cName}`);
    list.forEach(item => console.log(`  - ${item}`));
  }
}

inspect();
