const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

const envPath = path.resolve(process.cwd(), '.env.local');
const envFile = fs.readFileSync(envPath, 'utf8');

const envUrl = envFile.split('\n').find(l => l.startsWith('NEXT_PUBLIC_SUPABASE_URL='))?.split('=')[1]?.trim().replace(/^["']|["']$/g, '');
const envKey = envFile.split('\n').find(l => l.startsWith('SUPABASE_SERVICE_ROLE_KEY='))?.split('=')[1]?.trim().replace(/^["']|["']$/g, '');

const supabase = createClient(envUrl, envKey);

async function check() {
  // Check Quantum centre
  const { data: centre } = await supabase.from('centres').select('*').ilike('name', '%Quantum%').single();
  console.log('Quantum Centre:', centre);

  // Check Quantum slots
  const { data: qSlots } = await supabase.from('slots').select('*').eq('centre_id', centre.id);
  console.log('\nCurrent Quantum Centre Slots:', qSlots);

  // Check other Friday Centre Slots
  const { data: friSlots } = await supabase.from('slots')
    .select('*, centres(name)')
    .eq('day', 'FRIDAY')
    .not('centre_id', 'is', null);

  console.log('\nFriday Centre Slots count:', friSlots?.length);
  if (friSlots && friSlots.length > 0) {
    console.log('Sample Friday Centre Slots:', friSlots.slice(0, 4));
  }
}

check();
