const fs = require('fs');
const env = fs.readFileSync('.env.local', 'utf8').split('\n').reduce((acc, line) => {
  const [key, ...val] = line.split('=');
  if (key && val.length) acc[key.trim()] = val.join('=').trim().replace(/^['"]|['"]$/g, '');
  return acc;
}, {});

const { createClient } = require('@supabase/supabase-js');
const supabase = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);

const { resolveLockedCentreSlots } = require('../src/lib/deptCentreRules');

async function releaseBalance() {
  console.log('Fetching students, rules, and slots...');
  const { data: students } = await supabase.from('students').select('*').limit(3000);
  const { data: rules } = await supabase.from('section_booking_rules').select('*');
  const { data: slots } = await supabase.from('slots').select('id, day, session, start_time, end_time, club_id, centre_id, centre:centres(name)');

  const centreSlots = slots.filter(s => s.centre_id !== null);
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

  console.log('Fetching allocations with pagination...');
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
  console.log(`Fetched ${allAllocations.length} total allocations.`);

  const toReleaseIds = [];
  let keptMandatory = 0;
  let keptClubs = 0;

  allAllocations.forEach(a => {
    if (centreSlotIds.has(a.slot_id)) {
      const mandatorySet = studentMandatorySlotIds[a.student_id];
      if (mandatorySet && mandatorySet.has(a.slot_id)) {
        keptMandatory++;
      } else {
        toReleaseIds.push(a.id);
      }
    } else {
      keptClubs++;
    }
  });

  console.log(`\nReady to release:`);
  console.log(`- Kept Clubs: ${keptClubs}`);
  console.log(`- Kept Mandatory Locked Centres: ${keptMandatory}`);
  console.log(`- Non-Mandatory Centres to Delete: ${toReleaseIds.length}`);

  // Delete in batches of 100
  console.log('\nDeleting balance centre allocations in batches of 100...');
  for (let i = 0; i < toReleaseIds.length; i += 100) {
    const chunk = toReleaseIds.slice(i, i + 100);
    const { error: delErr } = await supabase.from('allocations').delete().in('id', chunk);
    if (delErr) console.error('Error deleting chunk:', delErr);
    if ((i + 100) % 1000 === 0 || i + 100 >= toReleaseIds.length) {
      console.log(`Deleted ${Math.min(i + 100, toReleaseIds.length)}/${toReleaseIds.length}...`);
    }
  }

  console.log('\nRecalculating allocated_count for all slots...');
  const { data: allSlots } = await supabase.from('slots').select('id');
  const poolSize = 25;
  for (let i = 0; i < allSlots.length; i += poolSize) {
    const chunk = allSlots.slice(i, i + poolSize);
    await Promise.all(chunk.map(async s => {
      const { count } = await supabase.from('allocations').select('*', { count: 'exact', head: true }).eq('slot_id', s.id);
      return supabase.from('slots').update({ allocated_count: count || 0 }).eq('id', s.id);
    }));
  }

  console.log('Done! All balance centre slots released and slot counts synchronized successfully.');
}

releaseBalance().catch(err => {
  console.error('Release failed:', err);
  process.exit(1);
});
