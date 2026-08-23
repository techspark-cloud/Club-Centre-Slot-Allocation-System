const fs = require('fs');
const env = fs.readFileSync('.env.local', 'utf8').split('\n').reduce((acc, line) => {
  const [key, ...val] = line.split('=');
  if (key && val.length) acc[key.trim()] = val.join('=').trim().replace(/^['"]|['"]$/g, '');
  return acc;
}, {});

const { createClient } = require('@supabase/supabase-js');
const supabase = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);

const COURSE = 'B.Tech. Artificial Intelligence and Data Science';
const SECTION = 'B';

async function runMigration() {
  console.log('Starting Migration for AIDS B...');

  // 1. Fetch AIDS B Students
  const { data: students, error: studentErr } = await supabase
    .from('students')
    .select('id')
    .ilike('course', '%Artificial Intelligence%')
    .eq('section', SECTION);

  if (studentErr) {
    console.error('Error fetching students:', studentErr);
    return;
  }
  
  const studentIds = students.map(s => s.id);
  console.log(`Found ${studentIds.length} AIDS B students.`);

  // 2. Fetch Wednesday Centre Slots
  const { data: wedSlots, error: wedErr } = await supabase
    .from('slots')
    .select('id')
    .eq('day', 'WEDNESDAY')
    .not('centre_id', 'is', null);

  if (wedErr) {
    console.error('Error fetching Wed slots:', wedErr);
    return;
  }
  
  const wedSlotIds = wedSlots.map(s => s.id);
  console.log(`Found ${wedSlotIds.length} Wednesday Centre slots.`);

  // 3. Delete those allocations
  if (studentIds.length > 0 && wedSlotIds.length > 0) {
    console.log('Deleting existing Wednesday Centre allocations for these students...');
    const { error: delErr, count } = await supabase
      .from('allocations')
      .delete({ count: 'exact' })
      .in('student_id', studentIds)
      .in('slot_id', wedSlotIds);
      
    if (delErr) console.error('Delete error:', delErr);
    else console.log(`Deleted ${count} allocations.`);
  }

  // 4. Update MONDAY rule
  console.log('Updating MONDAY rule...');
  const { data: existingMonday } = await supabase
    .from('section_booking_rules')
    .select('*')
    .eq('course', COURSE)
    .eq('section', SECTION)
    .eq('day', 'MONDAY')
    .single();

  if (existingMonday) {
    await supabase.from('section_booking_rules').update({
      allowed_timings: ["13:10:00-14:00:00", "14:00:00-15:40:00"]
    }).eq('id', existingMonday.id);
    console.log('Updated Monday rule.');
  } else {
    await supabase.from('section_booking_rules').insert({
      course: COURSE,
      section: SECTION,
      day: 'MONDAY',
      allowed_timings: ["13:10:00-14:00:00", "14:00:00-15:40:00"]
    });
    console.log('Inserted Monday rule.');
  }

  // 5. Update/Insert WEDNESDAY rule
  console.log('Updating WEDNESDAY rule...');
  const { data: existingWed } = await supabase
    .from('section_booking_rules')
    .select('*')
    .eq('course', COURSE)
    .eq('section', SECTION)
    .eq('day', 'WEDNESDAY')
    .single();

  if (existingWed) {
    await supabase.from('section_booking_rules').update({
      allowed_timings: ["14:00:00-15:40:00"]
    }).eq('id', existingWed.id);
    console.log('Updated Wednesday rule.');
  } else {
    await supabase.from('section_booking_rules').insert({
      course: COURSE,
      section: SECTION,
      day: 'WEDNESDAY',
      allowed_timings: ["14:00:00-15:40:00"]
    });
    console.log('Inserted Wednesday rule.');
  }
  
  console.log('Migration completed successfully!');
}

runMigration();
