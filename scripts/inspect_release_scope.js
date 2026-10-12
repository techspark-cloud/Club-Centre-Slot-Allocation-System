const fs = require('fs');
const env = fs.readFileSync('.env.local', 'utf8').split('\n').reduce((acc, line) => {
  const [key, ...val] = line.split('=');
  if (key && val.length) acc[key.trim()] = val.join('=').trim().replace(/^['"]|['"]$/g, '');
  return acc;
}, {});

const { createClient } = require('@supabase/supabase-js');
const supabase = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);

const { resolveLockedCentreSlots } = require('../src/lib/deptCentreRules');

async function inspectReleaseScope() {
  const { data: students } = await supabase.from('students').select('*').limit(3000);
  const { data: rules } = await supabase.from('section_booking_rules').select('*');
  const { data: slots } = await supabase.from('slots').select('id, day, session, start_time, end_time, club_id, centre_id, centre:centres(name)');

  const centreSlots = slots.filter(s => s.centre_id !== null);
  const clubSlotIds = new Set(slots.filter(s => s.club_id !== null).map(s => s.id));
  const centreSlotIds = new Set(centreSlots.map(s => s.id));

  // Determine all mandatory slot IDs for all students
  const studentMandatorySlotIds = {};
  students.forEach(s => {
    if (s.activity_session && s.allowed_day && s.allowed_day !== 'INDEPENDENT') {
      const sRules = rules.filter(r => r.course === s.course && r.section === s.section);
      const locked = resolveLockedCentreSlots(s, centreSlots, sRules);
      studentMandatorySlotIds[s.id] = new Set(Object.values(locked).map(item => item.slotId));
    } else {
      studentMandatorySlotIds[s.id] = new Set();
    }
  });

  // Fetch all allocations
  let allAllocations = [];
  let page = 0;
  while (true) {
    const { data: batch } = await supabase
      .from('allocations')
      .select('id, student_id, slot_id')
      .range(page * 1000, (page + 1) * 1000 - 1);
    if (!batch || batch.length === 0) break;
    allAllocations = allAllocations.concat(batch);
    if (batch.length < 1000) break;
    page++;
  }

  let clubAllocs = 0;
  let mandatoryCentreAllocs = 0;
  let nonMandatoryCentreAllocs = 0;

  allAllocations.forEach(a => {
    if (clubSlotIds.has(a.slot_id)) {
      clubAllocs++;
    } else if (centreSlotIds.has(a.slot_id)) {
      const mandatorySet = studentMandatorySlotIds[a.student_id];
      if (mandatorySet && mandatorySet.has(a.slot_id)) {
        mandatoryCentreAllocs++;
      } else {
        nonMandatoryCentreAllocs++;
      }
    }
  });

  console.log(`=== ALLOCATION BREAKDOWN ===`);
  console.log(`Total Allocations: ${allAllocations.length}`);
  console.log(`Club Allocations: ${clubAllocs}`);
  console.log(`Mandatory Locked Centre Allocations: ${mandatoryCentreAllocs}`);
  console.log(`Non-Mandatory Centre Allocations (to be released): ${nonMandatoryCentreAllocs}`);
}

inspectReleaseScope();
