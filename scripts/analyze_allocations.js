const fs = require('fs');
const env = fs.readFileSync('.env.local', 'utf8').split('\n').reduce((acc, line) => {
  const [key, ...val] = line.split('=');
  if (key && val.length) acc[key.trim()] = val.join('=').trim().replace(/^['"]|['"]$/g, '');
  return acc;
}, {});

const { createClient } = require('@supabase/supabase-js');
const supabase = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);

async function analyzeAll() {
  // 1. Check allocations count
  const { count: totalAlloc } = await supabase.from('allocations').select('*', { count: 'exact', head: true });
  console.log('Total allocations:', totalAlloc);

  // 2. Fetch sample allocations with student details
  const { data: allocs } = await supabase
    .from('allocations')
    .select('student_id, student:students(name, course, section, allowed_day, activity_session), slot:slots(id, day, start_time, end_time, session, type, club:clubs(name), centre:centres(name))')
    .limit(20);

  console.log('Sample allocations:');
  allocs?.forEach(a => {
    const ent = a.slot?.club ? `CLUB: ${a.slot.club.name}` : `CENTRE: ${a.slot?.centre?.name}`;
    console.log(`${a.student?.name} (${a.student?.course} Sec ${a.student?.section}) [Allowed: ${a.student?.allowed_day}, ${a.student?.activity_session}] -> ${a.slot?.day} ${ent} (${a.slot?.start_time.slice(0,5)}-${a.slot?.end_time.slice(0,5)})`);
  });

  // 3. Check how many allocations per student on average
  const { data: allStudentIds } = await supabase.from('allocations').select('student_id');
  const countPerStudent = {};
  allStudentIds?.forEach(a => {
    countPerStudent[a.student_id] = (countPerStudent[a.student_id] || 0) + 1;
  });
  const counts = Object.values(countPerStudent);
  const freq = {};
  counts.forEach(c => freq[c] = (freq[c] || 0) + 1);
  console.log('\nDistribution of allocations per student:', freq);
}

analyzeAll();
