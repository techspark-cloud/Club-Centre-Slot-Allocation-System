const fs = require('fs');
const env = fs.readFileSync('.env.local', 'utf8').split('\n').reduce((acc, line) => {
  const [key, ...val] = line.split('=');
  if (key && val.length) acc[key.trim()] = val.join('=').trim().replace(/^['"]|['"]$/g, '');
  return acc;
}, {});
const { createClient } = require('@supabase/supabase-js');
const supabase = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);

async function checkFullSlots() {
  const { data: slots } = await supabase
    .from('slots')
    .select('*, club:clubs(name), centre:centres(name)')
    .eq('status', 'ACTIVE');

  const full = slots.filter(s => s.allocated_count >= s.capacity);
  console.log('Total full slots:', full.length);
  full.forEach(s => {
    console.log(`${s.day} [${s.session}] ${s.club?.name || s.centre?.name}: ${s.allocated_count}/${s.capacity}`);
  });
}
checkFullSlots();
