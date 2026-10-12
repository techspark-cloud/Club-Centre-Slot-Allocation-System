const fs = require('fs');
const env = fs.readFileSync('.env.local', 'utf8').split('\n').reduce((acc, line) => {
  const [key, ...val] = line.split('=');
  if (key && val.length) acc[key.trim()] = val.join('=').trim().replace(/^['"]|['"]$/g, '');
  return acc;
}, {});

const { createClient } = require('@supabase/supabase-js');
const supabase = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);

async function checkStudentAllocations() {
  // Let's sample a few students from different departments with their allocations
  const { data: students } = await supabase.from('students').select('id, name, course, section, allowed_day, activity_session').limit(30);
  
  for (const s of students) {
    const { data: allocs } = await supabase
      .from('allocations')
      .select('id, slot:slots(id, day, start_time, end_time, session, type, club:clubs(name), centre:centres(name))')
      .eq('student_id', s.id);
    
    if (allocs && allocs.length > 0) {
      console.log(`Student: ${s.name} | ${s.course} Sec ${s.section} | Allowed Day: ${s.allowed_day} | Session: ${s.activity_session}`);
      allocs.forEach(a => {
        const entity = a.slot.club ? `CLUB: ${a.slot.club.name}` : `CENTRE: ${a.slot.centre?.name}`;
        console.log(`  - [${a.slot.day} ${a.slot.start_time.slice(0,5)}-${a.slot.end_time.slice(0,5)}] ${entity}`);
      });
    }
  }
}

checkStudentAllocations();
