const fs = require('fs');
const env = fs.readFileSync('.env.local', 'utf8').split('\n').reduce((acc, line) => {
  const [key, ...val] = line.split('=');
  if (key && val.length) acc[key.trim()] = val.join('=').trim().replace(/^['"]|['"]$/g, '');
  return acc;
}, {});

const { createClient } = require('@supabase/supabase-js');
const supabase = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);

async function fix() {
  const { data, error, count } = await supabase
    .from('students')
    .update({ allowed_day: 'MONDAY' })
    .ilike('course', '%Artificial Intelligence%')
    .eq('section', 'B');
    
  if (error) console.error(error);
  else console.log(`Successfully updated allowed_day to MONDAY for AIDS B students.`);
}
fix();
