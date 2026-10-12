const fs = require('fs');
const env = fs.readFileSync('.env.local', 'utf8').split('\n').reduce((acc, line) => {
  const [key, ...val] = line.split('=');
  if (key && val.length) acc[key.trim()] = val.join('=').trim().replace(/^['"]|['"]$/g, '');
  return acc;
}, {});

const { createClient } = require('@supabase/supabase-js');
const supabase = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);

async function checkAfterRelease() {
  const { count: totalAlloc } = await supabase.from('allocations').select('*', { count: 'exact', head: true });
  console.log('Total Allocations remaining in DB:', totalAlloc);

  // Sample students from CSE, AIML, AIDS, MECH, CSBS, ECE, CCE, VLSI
  const sampleCourses = [
    'B.E. Computer Science and Engineering',
    'B.E. Computer Science and Engineering (Artificial Intelligence and Machine Learning)',
    'B.Tech. Artificial Intelligence and Data Science',
    'B.E. Mechanical Engineering',
    'B.Tech. Computer Science and Business Systems',
    'B.E. Electronics and Communication Engineering',
    'B.E. Computer and Communication Engineering',
    'B.E. Electronics Engineering (VLSI Design and Technology)'
  ];

  for (const c of sampleCourses) {
    const { data: st } = await supabase.from('students').select('*').eq('course', c).limit(1).single();
    if (st) {
      const { data: allocs } = await supabase.from('allocations').select('slot:slots(day, start_time, end_time, club:clubs(name), centre:centres(name))').eq('student_id', st.id);
      console.log(`\n• ${st.name} (${st.course} Sec ${st.section}):`);
      allocs.forEach(a => {
        const type = a.slot.club ? `CLUB: ${a.slot.club.name}` : `🔒 MANDATORY CENTRE: ${a.slot.centre?.name}`;
        console.log(`    - [${a.slot.day} ${a.slot.start_time.slice(0,5)}-${a.slot.end_time.slice(0,5)}] ${type}`);
      });
    }
  }
}

checkAfterRelease();
