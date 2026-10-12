const fs = require('fs');
const env = fs.readFileSync('.env.local', 'utf8').split('\n').reduce((acc, line) => {
  const [key, ...val] = line.split('=');
  if (key && val.length) acc[key.trim()] = val.join('=').trim().replace(/^['"]|['"]$/g, '');
  return acc;
}, {});

const { createClient } = require('@supabase/supabase-js');
const supabase = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);

function getDeptFromCourse(course) {
  if (!course) return null;
  if (/Computer Science and Engineering(?!.*(Artificial Intelligence|Business))/i.test(course)) return 'CSE';
  if (/Artificial Intelligence and Machine Learning/i.test(course)) return 'AIML';
  if (/Artificial Intelligence and Data Science/i.test(course)) return 'AIDS';
  if (/Mechanical/i.test(course)) return 'MECH';
  if (/Business Systems/i.test(course)) return 'CSBS';
  if (/Electronics and Communication/i.test(course)) return 'ECE';
  if (/Computer and Communication/i.test(course)) return 'CCE';
  if (/VLSI/i.test(course)) return 'VLSI';
  return null;
}

function getMandatoryCentresForStudent(course, section) {
  const dept = getDeptFromCourse(course);
  if (!dept) return [];

  switch (dept) {
    case 'CSE':
      return ['Centre For Image Processing', 'Center for Apple'];
    case 'AIML':
      return ['Centre for ZF', 'Centre for AI (Artificial Intelligence)'];
    case 'AIDS': {
      const sec = (section || '').toUpperCase().trim();
      if (['B', 'C', 'G'].includes(sec)) {
        return ['Centre for ZF', 'Centre for AI (Artificial Intelligence)'];
      }
      return ['Center for Data Science', 'Center for Cloud'];
    }
    case 'MECH':
      return ['Centre for Smart Manufacturing', 'Center for EV & Energy'];
    case 'CSBS':
      return ['Centre for ARVR (Augmented Reality / Virtual Reality)', 'Centre for Cybersecurity'];
    case 'ECE':
      return ['Centre for IoT (Internet of Things)', 'Centre for RADAR'];
    case 'CCE':
      return ['Center for Space'];
    case 'VLSI':
      return ['Centre for Semiconductor Design'];
    default:
      return [];
  }
}

function isSemiconductorAllowed(course) {
  const dept = getDeptFromCourse(course);
  return dept === 'VLSI' || dept === 'ECE';
}

function resolveLockedCentreSlots(student, centreSlots, customRules) {
  const mandatoryCentres = getMandatoryCentresForStudent(student.course, student.section);
  if (mandatoryCentres.length === 0) return {};

  const stdDays = (student.allowed_day && student.allowed_day !== 'ANY' && student.allowed_day !== 'INDEPENDENT')
    ? student.allowed_day.split(',').map(d => d.trim()).filter(Boolean)
    : [];

  const allDays = ['MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY'];
  const availableCentreDays = [];

  allDays.forEach(day => {
    const r = customRules.find(rule => rule.day === day);
    if (r) {
      if (r.allowed_timings && r.allowed_timings.some(t => t.includes('09:40') || t.includes('13:10'))) {
        availableCentreDays.push(day);
      }
    } else if (stdDays.includes(day)) {
      availableCentreDays.push(day);
    }
  });

  const assignments = {};
  const usedDays = new Set();

  for (const cName of mandatoryCentres) {
    const validSlots = centreSlots.filter(s => {
      if (s.centre?.name !== cName) return false;
      if (!availableCentreDays.includes(s.day)) return false;

      const r = customRules.find(rule => rule.day === s.day);
      if (r) {
        const f1 = `${s.start_time.slice(0, 5)} - ${s.end_time.slice(0, 5)}`;
        const f2 = `${s.start_time}-${s.end_time}`;
        return r.allowed_timings.some(t => 
          t === f1 || t === f2 || t.replace(/\s+/g, '') === f2.replace(/\s+/g, '')
        );
      }

      return s.session === student.activity_session;
    });

    const availSlot = validSlots.find(s => !usedDays.has(s.day));
    if (availSlot) {
      usedDays.add(availSlot.day);
      assignments[availSlot.day] = {
        slotId: availSlot.id,
        centreName: cName,
        day: availSlot.day,
        timing: `${availSlot.start_time.slice(0, 5)} - ${availSlot.end_time.slice(0, 5)}`
      };
    }
  }

  return assignments;
}

async function runMigration() {
  console.log('Fetching students with pagination...');
  let students = [];
  let sPage = 0;
  while (true) {
    const { data: sBatch, error: sErr } = await supabase
      .from('students')
      .select('*')
      .range(sPage * 1000, (sPage + 1) * 1000 - 1);
    if (sErr) throw sErr;
    if (!sBatch || sBatch.length === 0) break;
    students = students.concat(sBatch);
    if (sBatch.length < 1000) break;
    sPage++;
  }
  console.log(`Fetched ${students.length} students total.`);

  console.log('Fetching rules and centre slots...');
  const { data: rules } = await supabase.from('section_booking_rules').select('*');
  const { data: slots } = await supabase
    .from('slots')
    .select('id, day, session, start_time, end_time, capacity, allocated_count, centre_id, club_id, centre:centres(name)')
    .not('centre_id', 'is', null);

  const centreSlotMap = {};
  slots.forEach(s => centreSlotMap[s.id] = s);

  console.log('Fetching allocations with pagination...');
  let allAllocations = [];
  let page = 0;
  while (true) {
    const { data: batch, error: aErr } = await supabase
      .from('allocations')
      .select('id, student_id, slot_id')
      .range(page * 1000, (page + 1) * 1000 - 1);
    if (aErr) throw aErr;
    if (!batch || batch.length === 0) break;
    allAllocations = allAllocations.concat(batch);
    if (batch.length < 1000) break;
    page++;
  }
  console.log(`Total allocations fetched: ${allAllocations.length}`);

  const studentAllocMap = {};
  allAllocations.forEach(a => {
    if (!studentAllocMap[a.student_id]) studentAllocMap[a.student_id] = [];
    studentAllocMap[a.student_id].push(a);
  });

  const toDeleteIds = [];
  const toUpdate = [];
  const toInsertRows = [];
  let alreadyCorrect = 0;

  console.log('Computing operations...');
  for (const student of students) {
    if (!student.activity_session || !student.allowed_day || student.allowed_day === 'INDEPENDENT') continue;

    const studentRules = rules.filter(r => r.course === student.course && r.section === student.section);
    const lockedAssignments = resolveLockedCentreSlots(student, slots, studentRules);
    const studentAllocs = studentAllocMap[student.id] || [];

    // 1. Clean up invalid Semiconductor if student is NOT VLSI and NOT ECE
    if (!isSemiconductorAllowed(student.course)) {
      for (const a of studentAllocs) {
        const slot = centreSlotMap[a.slot_id];
        if (slot && slot.centre?.name === 'Centre for Semiconductor Design') {
          toDeleteIds.push(a.id);
        }
      }
    }

    // 2. Ensure each mandatory centre is allocated
    for (const [day, assignment] of Object.entries(lockedAssignments)) {
      const existingSameSlot = studentAllocs.find(a => a.slot_id === assignment.slotId);
      if (existingSameSlot) {
        alreadyCorrect++;
        continue;
      }

      const conflictingSameDayAlloc = studentAllocs.find(a => {
        const s = centreSlotMap[a.slot_id];
        return s && s.day === day && a.slot_id !== assignment.slotId;
      });

      if (conflictingSameDayAlloc) {
        toUpdate.push({ id: conflictingSameDayAlloc.id, slot_id: assignment.slotId });
        conflictingSameDayAlloc.slot_id = assignment.slotId;
      } else {
        toInsertRows.push({ student_id: student.id, slot_id: assignment.slotId });
        studentAllocs.push({ id: 'temp', student_id: student.id, slot_id: assignment.slotId });
      }
    }
  }

  console.log(`Operations to perform:`);
  console.log(`- Already Correct (Kept): ${alreadyCorrect}`);
  console.log(`- To Re-align (Updates): ${toUpdate.length}`);
  console.log(`- To Insert: ${toInsertRows.length}`);
  console.log(`- To Delete (Semiconductor Clean): ${toDeleteIds.length}`);

  // Execute Deletes in chunks of 100
  if (toDeleteIds.length > 0) {
    console.log('Executing deletes...');
    for (let i = 0; i < toDeleteIds.length; i += 100) {
      const chunk = toDeleteIds.slice(i, i + 100);
      await supabase.from('allocations').delete().in('id', chunk);
    }
  }

  // Execute Inserts in chunks of 100
  if (toInsertRows.length > 0) {
    console.log('Executing inserts...');
    for (let i = 0; i < toInsertRows.length; i += 100) {
      const chunk = toInsertRows.slice(i, i + 100);
      const { error: insErr } = await supabase.from('allocations').insert(chunk);
      if (insErr) console.error('Insert error:', insErr);
    }
  }

  // Execute Updates in parallel batches of 25
  if (toUpdate.length > 0) {
    console.log('Executing updates with parallel pool...');
    const poolSize = 25;
    for (let i = 0; i < toUpdate.length; i += poolSize) {
      const chunk = toUpdate.slice(i, i + poolSize);
      await Promise.all(chunk.map(item => 
        supabase.from('allocations').update({ slot_id: item.slot_id }).eq('id', item.id)
      ));
      if ((i + poolSize) % 200 === 0 || i + poolSize >= toUpdate.length) {
        console.log(`Updated ${Math.min(i + poolSize, toUpdate.length)}/${toUpdate.length}...`);
      }
    }
  }

  console.log('\n=============================================');
  console.log('SYNCING ALLOCATED COUNTS ON ALL SLOTS...');
  console.log('=============================================');
  const { data: allSlots } = await supabase.from('slots').select('id');
  const poolSize = 25;
  for (let i = 0; i < allSlots.length; i += poolSize) {
    const chunk = allSlots.slice(i, i + poolSize);
    await Promise.all(chunk.map(async s => {
      const { count } = await supabase.from('allocations').select('*', { count: 'exact', head: true }).eq('slot_id', s.id);
      return supabase.from('slots').update({ allocated_count: count || 0 }).eq('id', s.id);
    }));
  }
  console.log(`Synced ${allSlots.length} slots allocated_counts successfully!`);
}

runMigration().catch(err => {
  console.error('Migration failed with error:', err);
  process.exit(1);
});
