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

  for (const reg of regs) {
    const { data: st } = await supabase.from('students').select('id, name, course, section, allowed_day').eq('register_no', reg).single();
    const { data: allocs } = await supabase.from('allocations').select('*, slot:slots(*, club:clubs(name), centre:centres(name))').eq('student_id', st.id);
    console.log(reg, st.name, allocs.map(a => `${a.slot?.day} (${a.slot?.club ? 'CLUB: ' + a.slot?.club?.name : 'CENTRE: ' + a.slot?.centre?.name})`));
  }
}
check();
