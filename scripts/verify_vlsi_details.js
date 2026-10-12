const fs = require('fs');
const env = fs.readFileSync('.env.local', 'utf8').split('\n').reduce((acc, line) => {
  const [key, ...val] = line.split('=');
  if (key && val.length) acc[key.trim()] = val.join('=').trim().replace(/^['"]|['"]$/g, '');
  return acc;
}, {});

const { createClient } = require('@supabase/supabase-js');
const supabase = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);

async function verifyAllVLSI() {
  const { data: vlsiStudents } = await supabase
    .from('students')
    .select('id, name, register_no, section, allowed_day, activity_session')
    .ilike('course', '%VLSI%');

  console.log(`Total VLSI Students fetched: ${vlsiStudents.length}`);

  let secAWithSemi = 0;
  let secBWithSemi = 0;
  let secANoSemi = 0;
  let secBNoSemi = 0;

  for (const s of vlsiStudents) {
    const { data: allocs } = await supabase
      .from('allocations')
      .select('slot:slots(centre:centres(name), day, start_time)')
      .eq('student_id', s.id);

    const hasSemi = allocs?.some(a => a.slot?.centre?.name === 'Centre for Semiconductor Design');
    if (s.section === 'A') {
      if (hasSemi) secAWithSemi++; else secANoSemi++;
    } else if (s.section === 'B') {
      if (hasSemi) secBWithSemi++; else secBNoSemi++;
    }
  }

  console.log(`VLSI Section A (Total: 60): With Semiconductor = ${secAWithSemi}, Without = ${secANoSemi}`);
  console.log(`VLSI Section B (Total: 60): With Semiconductor = ${secBWithSemi}, Without = ${secBNoSemi}`);
}

verifyAllVLSI();
