require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');
const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
const { resolveLockedCentreSlots } = require('../src/lib/deptCentreRules');

async function check() {
  const reg = '2117250070132';
  const { data: student } = await supabase.from('students').select('*').eq('register_no', reg).single();
  const { data: centreSlots } = await supabase.from('slots').select('*, centre:centres(*)').not('centre_id', 'is', null).eq('status', 'ACTIVE');
  const { data: customRules } = await supabase.from('section_booking_rules').select('*').eq('course', student.course).eq('section', student.section);

  const locked = resolveLockedCentreSlots(student, centreSlots, customRules);
  console.log('resolveLockedCentreSlots result for', student.name, ':', locked);
}
check();
