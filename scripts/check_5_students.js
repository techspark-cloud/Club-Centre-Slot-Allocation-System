const fs = require('fs');
const env = fs.readFileSync('.env.local', 'utf8').split('\n').reduce((acc, line) => {
  const [key, ...val] = line.split('=');
  if (key && val.length) acc[key.trim()] = val.join('=').trim().replace(/^['"]|['"]$/g, '');
  return acc;
}, {});

const { createClient } = require('@supabase/supabase-js');
const supabase = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);

async function check() {
  const regs = [
    '2117250070177',
    '2117250070166',
    '2117250070147',
    '2117250070142',
    '2117250070132'
  ];

  const { data: students } = await supabase
    .from('students')
    .select('id, name, register_no, course, section, allowed_day, activity_session')
    .in('register_no', regs);

  console.log('Students count:', students?.length);

  // Check Quantum Monday afternoon slot
  const { data: slot } = await supabase
    .from('slots')
    .select('*, centre:centres(name)')
    .eq('id', 'e4ec34d1-09c6-4447-92fc-4964f8cbc932')
    .single();
  console.log('Quantum slot:', slot);

  // Check existing allocations for each student
  for (const s of students || []) {
    const { data: allocs } = await supabase
      .from('allocations')
      .select('*, slot:slots(*, club:clubs(name), centre:centres(name))')
      .eq('student_id', s.id);
    const summary = allocs.map(a => `${a.slot?.day} [${a.slot?.club ? 'CLUB: ' + a.slot?.club?.name : 'CENTRE: ' + a.slot?.centre?.name}]`);
    console.log(`\nAllocations for ${s.name} (${s.register_no}, ${s.course} Sec ${s.section}, Allowed: ${s.allowed_day}):`);
    console.log(summary);
  }
}
check();
