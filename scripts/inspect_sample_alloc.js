const fs = require('fs');
const env = fs.readFileSync('.env.local', 'utf8').split('\n').reduce((acc, line) => {
  const [key, ...val] = line.split('=');
  if (key && val.length) acc[key.trim()] = val.join('=').trim().replace(/^['"]|['"]$/g, '');
  return acc;
}, {});

const { createClient } = require('@supabase/supabase-js');
const supabase = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);

async function inspectSample() {
  const { data: sample } = await supabase.from('allocations').select('*').limit(5);
  console.log('Sample allocation row:', sample);

  if (sample && sample.length > 0) {
    const { data: st } = await supabase.from('students').select('*').eq('id', sample[0].student_id);
    console.log('Student:', st);
    const { data: sl } = await supabase.from('slots').select('*, club:clubs(name), centre:centres(name)').eq('id', sample[0].slot_id);
    console.log('Slot:', sl);
  }
}

inspectSample();
