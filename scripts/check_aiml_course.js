const fs = require('fs');
const env = fs.readFileSync('.env.local', 'utf8').split('\n').reduce((acc, line) => {
  const [key, ...val] = line.split('=');
  if (key && val.length) acc[key.trim()] = val.join('=').trim().replace(/^['"]|['"]$/g, '');
  return acc;
}, {});

const { createClient } = require('@supabase/supabase-js');
const supabase = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);

async function checkAIML() {
  const { data: students } = await supabase
    .from('students')
    .select('id, name, course, section, allowed_day, activity_session')
    .ilike('course', '%Machine Learning%');

  console.log('AIML students count:', students?.length);
  const secMap = {};
  students?.forEach(s => {
    secMap[s.section] = (secMap[s.section] || 0) + 1;
  });
  console.log('Sections:', secMap);

  const { data: rules } = await supabase
    .from('section_booking_rules')
    .select('*')
    .ilike('course', '%Machine Learning%');
  console.log('Rules for AIML:', rules);
}

checkAIML();
