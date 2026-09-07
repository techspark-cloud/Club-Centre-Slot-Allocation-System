const fs = require('fs');
const env = fs.readFileSync('.env.local', 'utf8').split('\n').reduce((acc, line) => {
  const [key, ...val] = line.split('=');
  if (key && val.length) acc[key.trim()] = val.join('=').trim().replace(/^['"]|['"]$/g, '');
  return acc;
}, {});

const { createClient } = require('@supabase/supabase-js');
const supabase = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);

async function run() {
  console.log('Fetching all students...');
  const { data: students, error } = await supabase.from('students').select('id, name, course, section, activity_session, allowed_day, register_no');

  if (error) {
    console.error(error);
    return;
  }

  const unmapped = students.filter(s => !s.activity_session || !s.allowed_day);
  console.log(`Found ${unmapped.length} unmapped students.`);

  let updatedCount = 0;

  for (const student of unmapped) {
    // Find a mapped student in the same course and section
    const peer = students.find(s => 
      s.course === student.course && 
      s.section === student.section && 
      s.activity_session && 
      s.allowed_day && 
      s.id !== student.id
    );

    if (peer) {
      console.log(`Syncing ${student.name} (${student.course} Sec ${student.section}) with session ${peer.activity_session} and day ${peer.allowed_day} based on peer ${peer.name}`);
      
      const { error: updateError } = await supabase
        .from('students')
        .update({
          activity_session: peer.activity_session,
          allowed_day: peer.allowed_day
        })
        .eq('id', student.id);

      if (updateError) {
        console.error(`Failed to update ${student.name}:`, updateError);
      } else {
        updatedCount++;
      }
    } else {
      console.log(`Could not find a mapped peer for ${student.name} (${student.course} Sec ${student.section}).`);
    }
  }

  console.log(`Successfully synced ${updatedCount} students.`);
}

run();
