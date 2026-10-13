require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');
const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function completeSchedule() {
  const regs = [
    '2117250070177',
    '2117250070166',
    '2117250070147',
    '2117250070142',
    '2117250070132'
  ];

  const aiSlotId = '96683503-6126-4d6b-b4ca-e1fc13d08730'; // Tuesday Afternoon AI
  const zfSlotId = 'dc4b9598-3b38-418a-9c25-914ae94e1eac'; // Friday Afternoon ZF

  for (const reg of regs) {
    const { data: st } = await supabase.from('students').select('*').eq('register_no', reg).single();
    const { data: allocs } = await supabase.from('allocations').select('*, slot:slots(*)').eq('student_id', st.id);

    const hasTuesday = allocs.some(a => a.slot?.day === 'TUESDAY');
    const hasFridayCentre = allocs.some(a => a.slot?.day === 'FRIDAY' && a.slot?.centre_id !== null);

    console.log(reg, st.name, 'hasTuesday:', hasTuesday, 'hasFridayCentre:', hasFridayCentre);

    if (!hasTuesday) {
      await supabase.from('allocations').insert({ student_id: st.id, slot_id: aiSlotId });
      console.log(`Allocated Tuesday Centre for AI to ${st.name}`);
    }
    if (!hasFridayCentre) {
      await supabase.from('allocations').insert({ student_id: st.id, slot_id: zfSlotId });
      console.log(`Allocated Friday Centre for ZF to ${st.name}`);
    }
  }

  // Update counts
  const { count: cAI } = await supabase.from('allocations').select('*', { count: 'exact', head: true }).eq('slot_id', aiSlotId);
  await supabase.from('slots').update({ allocated_count: cAI, capacity: Math.max(165, cAI + 20) }).eq('id', aiSlotId);

  const { count: cZF } = await supabase.from('allocations').select('*', { count: 'exact', head: true }).eq('slot_id', zfSlotId);
  await supabase.from('slots').update({ allocated_count: cZF, capacity: Math.max(120, cZF + 20) }).eq('id', zfSlotId);

  console.log('\n--- VERIFY FINAL ALLOCATIONS FOR THE 5 STUDENTS ---');
  for (const reg of regs) {
    const { data: st } = await supabase.from('students').select('*').eq('register_no', reg).single();
    const { data: allocs } = await supabase.from('allocations').select('*, slot:slots(*, club:clubs(name), centre:centres(name))').eq('student_id', st.id);
    console.log(`\n${st.name} (${reg}):`);
    allocs.forEach(a => {
      const s = a.slot;
      const type = s.club ? 'CLUB' : 'CENTRE';
      const name = s.club?.name || s.centre?.name;
      console.log(`  ${s.day} [${s.session}] (${s.start_time.substring(0,5)}-${s.end_time.substring(0,5)}) -> ${type}: ${name} @ ${s.venue}`);
    });
  }
}

completeSchedule();
