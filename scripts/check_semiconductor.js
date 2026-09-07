const fs = require('fs');
const env = fs.readFileSync('.env.local', 'utf8').split('\n').reduce((acc, line) => {
  const [key, ...val] = line.split('=');
  if (key && val.length) acc[key.trim()] = val.join('=').trim().replace(/^['"]|['"]$/g, '');
  return acc;
}, {});

const { createClient } = require('@supabase/supabase-js');
const supabase = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);

async function run() {
  const { data: centres } = await supabase.from('centres').select('*').ilike('name', '%Semiconductor%');
  console.log('Centres:', centres);

  const { data: courses } = await supabase.from('students').select('course');
  const uniqueCourses = [...new Set(courses.map(c => c.course))];
  console.log('Unique Courses:', uniqueCourses);
}
run();
