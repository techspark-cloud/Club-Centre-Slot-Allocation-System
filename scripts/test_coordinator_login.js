const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

const envPath = path.resolve(process.cwd(), '.env.local');
const envFile = fs.readFileSync(envPath, 'utf8');

const envUrl = envFile.split('\n').find(l => l.startsWith('NEXT_PUBLIC_SUPABASE_URL='))?.split('=')[1]?.trim().replace(/^["']|["']$/g, '');
const anonKey = envFile.split('\n').find(l => l.startsWith('NEXT_PUBLIC_SUPABASE_ANON_KEY='))?.split('=')[1]?.trim().replace(/^["']|["']$/g, '');

const supabase = createClient(envUrl, anonKey);

async function test() {
  const { data, error } = await supabase.auth.signInWithPassword({
    email: '9840259511@rit.faculty',
    password: '9840259511'
  });
  
  if (error) {
    console.error('Sign in failed:', error);
    return;
  }
  console.log('✅ Login successful! User ID:', data.user.id);

  const { data: profile, error: profErr } = await supabase.from('profiles').select('*').eq('id', data.user.id).single();
  console.log('✅ Profile:', profile);

  const { data: mapping, error: mapErr } = await supabase.from('centre_coordinators').select('*, centres(*)').eq('profile_id', data.user.id);
  console.log('✅ Centres Mapped:', mapping);

  if (mapping && mapping.length > 0) {
    const { data: slots, error: slotErr } = await supabase.from('slots').select('*').eq('centre_id', mapping[0].centre_id);
    console.log(`✅ Slots found for ${mapping[0].centres?.name}:`, slots?.length);
    if (slots) {
      slots.forEach(s => console.log(`   - Day: ${s.day_of_week} | Session: ${s.session_period} (${s.start_time}-${s.end_time}) | Venue: ${s.venue} | Capacity: ${s.capacity}`));
    }
  }
}

test();
