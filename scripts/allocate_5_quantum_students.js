const fs = require('fs');
const env = fs.readFileSync('.env.local', 'utf8').split('\n').reduce((acc, line) => {
  const [key, ...val] = line.split('=');
  if (key && val.length) acc[key.trim()] = val.join('=').trim().replace(/^['"]|['"]$/g, '');
  return acc;
}, {});

const { createClient } = require('@supabase/supabase-js');
const supabase = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);

async function allocateAll() {
  const studentRegs = [
    '2117250070177',
    '2117250070166',
    '2117250070147',
    '2117250070142',
    '2117250070132'
  ];

  const slotId = 'e4ec34d1-09c6-4447-92fc-4964f8cbc932'; // Monday Afternoon Quantum Centre

  // 1. Get slot
  const { data: slot, error: slErr } = await supabase
    .from('slots')
    .select('*, centre:centres(name)')
    .eq('id', slotId)
    .single();

  if (slErr || !slot) {
    console.error('Slot not found:', slErr);
    return;
  }
  console.log('Target Slot:', slot.day, slot.session, slot.centre?.name, 'Current:', slot.allocated_count, '/', slot.capacity);

  // 2. Increase capacity upfront to 50 so constraint doesn't hit
  await supabase.from('slots').update({ capacity: 50 }).eq('id', slotId);

  // 3. Process each student
  for (const reg of studentRegs) {
    const { data: student, error: sErr } = await supabase
      .from('students')
      .select('id, name, register_no, course, section')
      .eq('register_no', reg)
      .single();

    if (sErr || !student) {
      console.error('Student not found:', reg, sErr);
      continue;
    }

    // Check existing Monday alloc
    const { data: existingAllocs } = await supabase
      .from('allocations')
      .select('*, slot:slots(*)')
      .eq('student_id', student.id);

    const mondayAlloc = existingAllocs.find(a => a.slot && a.slot.day === 'MONDAY');
    if (mondayAlloc) {
      if (mondayAlloc.slot_id === slotId) {
        console.log(`${student.name} (${reg}) already allocated to Quantum Centre!`);
        continue;
      } else {
        console.log(`Replacing Monday allocation for ${student.name} (${reg})...`);
        await supabase.from('allocations').update({ slot_id: slotId }).eq('id', mondayAlloc.id);
      }
    } else {
      console.log(`Inserting Monday Quantum allocation for ${student.name} (${reg})...`);
      const { data: newAlloc, error: insErr } = await supabase
        .from('allocations')
        .insert({
          student_id: student.id,
          slot_id: slotId
        })
        .select()
        .single();
      if (insErr) {
        console.error('Insert error for', reg, insErr);
      } else {
        console.log(`Created alloc ID: ${newAlloc.id}`);
      }
    }
  }

  // 4. Resync exact allocated_count on slot
  const { count } = await supabase
    .from('allocations')
    .select('*', { count: 'exact', head: true })
    .eq('slot_id', slotId);

  const finalCapacity = Math.max(50, count);
  await supabase
    .from('slots')
    .update({
      allocated_count: count,
      capacity: finalCapacity
    })
    .eq('id', slotId);

  console.log(`\nUpdated Quantum Slot: ${count} / ${finalCapacity}`);

  // 5. Verify all 5 students
  console.log('\n--- VERIFICATION OF ALL 5 STUDENTS ---');
  for (const reg of studentRegs) {
    const { data: student } = await supabase
      .from('students')
      .select('id, name, register_no')
      .eq('register_no', reg)
      .single();

    const { data: finalAllocs } = await supabase
      .from('allocations')
      .select('*, slot:slots(*, club:clubs(name), centre:centres(name))')
      .eq('student_id', student.id);

    console.log(`\nStudent: ${student.name} (${student.register_no})`);
    finalAllocs.forEach(a => {
      const s = a.slot;
      const name = s.club ? s.club.name : s.centre?.name;
      const type = s.club ? 'CLUB' : 'CENTRE';
      console.log(`  - ${s.day} [${s.session}] (${s.start_time.substring(0,5)} - ${s.end_time.substring(0,5)}) -> ${type}: ${name} @ ${s.venue}`);
    });
  }
}

allocateAll();
