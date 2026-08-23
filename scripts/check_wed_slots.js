const fs = require('fs');
const env = fs.readFileSync('.env.local', 'utf8').split('\n').reduce((acc, line) => {
  const [key, ...val] = line.split('=');
  if (key && val.length) acc[key.trim()] = val.join('=').trim().replace(/^['"]|['"]$/g, '');
  return acc;
}, {});

const { createClient } = require('@supabase/supabase-js');
const supabase = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);

async function checkSlots() {
  const { data: slots } = await supabase
    .from('slots')
    .select('*')
    .eq('day', 'WEDNESDAY')
    .eq('session', 'AFTERNOON');
    
  const centres = slots.filter(s => s.centre_id !== null);
  const clubs = slots.filter(s => s.club_id !== null);
  
  console.log('WED AFTERNOON Slots:');
  console.log('Centres at 13:10:', centres.filter(s => s.start_time.startsWith('13:10')).length);
  console.log('Centres at 14:00:', centres.filter(s => s.start_time.startsWith('14:00')).length);
  console.log('Clubs at 13:10:', clubs.filter(s => s.start_time.startsWith('13:10')).length);
  console.log('Clubs at 14:00:', clubs.filter(s => s.start_time.startsWith('14:00')).length);
}
checkSlots();
