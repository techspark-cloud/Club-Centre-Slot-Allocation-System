const fs = require('fs');
const env = fs.readFileSync('.env.local', 'utf8').split('\n').reduce((acc, line) => {
  const [key, ...val] = line.split('=');
  if (key && val.length) acc[key.trim()] = val.join('=').trim().replace(/^['"]|['"]$/g, '');
  return acc;
}, {});

const { createClient } = require('@supabase/supabase-js');
const supabase = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);

async function checkData() {
  const { data: students } = await supabase
    .from('students')
    .select('*')
    .ilike('course', '%Artificial%')
    .eq('section', 'B')
    .limit(1);
    
  if (students && students.length > 0) {
    console.log('Sample AIDS B student:', students[0].course, students[0].section, 'Allowed Day:', students[0].allowed_day, 'Session:', students[0].activity_session);
  } else {
    console.log('No AIDS B students found.');
  }
  
  const { data: rules } = await supabase
    .from('section_booking_rules')
    .select('*')
    .ilike('course', '%Artificial%')
    .eq('section', 'B');
    
  console.log('Existing Rules:', rules);
}
checkData();
