require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');
const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function checkOtherSecC() {
  const { data: students } = await supabase
    .from('students')
    .select('id, name, register_no')
    .eq('course', 'B.Tech. Artificial Intelligence and Data Science')
    .eq('section', 'C')
    .limit(10);

  for (const s of students) {
    const { data: allocs } = await supabase
      .from('allocations')
      .select('*, slot:slots(*, club:clubs(name), centre:centres(name))')
      .eq('student_id', s.id);
    const summary = allocs.map(a => `${a.slot?.day} ${a.slot?.club ? 'CLUB: ' + a.slot?.club?.name : 'CENTRE: ' + a.slot?.centre?.name}`);
    console.log(s.register_no, s.name, summary);
  }
}
checkOtherSecC();
