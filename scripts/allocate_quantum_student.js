const fs = require('fs');
const env = fs.readFileSync('.env.local', 'utf8').split('\n').reduce((acc, line) => {
  const [key, ...val] = line.split('=');
  if (key && val.length) acc[key.trim()] = val.join('=').trim().replace(/^['"]|['"]$/g, '');
  return acc;
}, {});

const { createClient } = require('@supabase/supabase-js');
const supabase = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);

async function allocate() {
  const studentReg = '2117250070135';
  const slotId = 'e4ec34d1-09c6-4447-92fc-4964f8cbc932'; // Monday Afternoon Quantum Centre

  // 1. Get student
  const { data: student, error: sErr } = await supabase
    .from('students')
    .select('id, name, register_no, course, section')
    .eq('register_no', studentReg)
    .single();

  if (sErr || !student) {
    console.error('Student not found:', sErr);
    return;
  }
  console.log('Allocating for student:', student.name, student.register_no);

  // 2. Check slot
  const { data: slot, error: slErr } = await supabase
    .from('slots')
    .select('*, centre:centres(name)')
    .eq('id', slotId)
    .single();

  if (slErr || !slot) {
    console.error('Slot not found:', slErr);
    return;
  }
  console.log('Target Slot:', slot.day, slot.session, slot.centre?.name, slot.venue, slot.start_time, '-', slot.end_time);

  // 3. Check existing allocation for this student on Monday
  const { data: existingAllocs } = await supabase
    .from('allocations')
    .select('*, slot:slots(*)')
    .eq('student_id', student.id);

  const existingMonday = existingAllocs.find(a => a.slot && a.slot.day === 'MONDAY');
  if (existingMonday) {
    console.log('Student already had a Monday allocation:', existingMonday);
    if (existingMonday.slot_id === slotId) {
      console.log('Already allocated to this exact slot!');
      return;
    }
  }

  // 4. Insert allocation
  const { data: newAlloc, error: insErr } = await supabase
    .from('allocations')
    .insert({
      student_id: student.id,
      slot_id: slot.id
    })
    .select()
    .single();

  if (insErr) {
    console.error('Failed to insert allocation:', insErr);
    return;
  }
  console.log('Successfully created allocation ID:', newAlloc.id);

  // 5. Update slot allocated_count
  const { count } = await supabase
    .from('allocations')
    .select('*', { count: 'exact', head: true })
    .eq('slot_id', slot.id);

  const newCapacity = Math.max(slot.capacity, count);
  const { error: upErr } = await supabase
    .from('slots')
    .update({ 
      allocated_count: count,
      capacity: newCapacity
    })
    .eq('id', slot.id);

  if (upErr) {
    console.error('Failed to update slot count:', upErr);
  } else {
    console.log('Slot count updated to:', count, '/', newCapacity);
  }

  // 6. Verify all allocations for student
  const { data: finalAllocs } = await supabase
    .from('allocations')
    .select('*, slot:slots(*, club:clubs(name), centre:centres(name))')
    .eq('student_id', student.id);

  console.log('\nFinal Allocations for', student.name, '(' + student.register_no + '):');
  finalAllocs.forEach(a => {
    const s = a.slot;
    const name = s.club ? s.club.name : s.centre?.name;
    const type = s.club ? 'CLUB' : 'CENTRE';
    console.log('- ' + s.day + ' [' + s.session + '] (' + s.start_time.substring(0,5) + ' - ' + s.end_time.substring(0,5) + ') -> ' + type + ': ' + name + ' @ ' + s.venue);
  });
}

allocate();
