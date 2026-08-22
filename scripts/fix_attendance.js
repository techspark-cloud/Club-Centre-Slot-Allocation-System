const fs = require('fs');
const env = fs.readFileSync('.env.local', 'utf8').split('\n').reduce((acc, line) => {
  const [key, ...val] = line.split('=');
  if (key && val.length) acc[key.trim()] = val.join('=').trim().replace(/^['"]|['"]$/g, '');
  return acc;
}, {});

const { createClient } = require('@supabase/supabase-js');
const supabase = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);

async function fixAttendance() {
  const { data: student } = await supabase
    .from('students')
    .select('id, name')
    .eq('register_no', '2117250020002')
    .single();
    
  if (!student) {
    console.error('Student not found');
    return;
  }
  
  console.log('Found student:', student.name);
  
  const { error } = await supabase
    .from('attendance')
    .delete()
    .eq('student_id', student.id)
    .eq('date', '2026-08-24');
    
  if (error) {
    console.error('Error:', error);
  } else {
    console.log('Success! Deleted the accidental attendance record.');
  }
}
fixAttendance();
