const { createClient } = require('@supabase/supabase-js');
const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function run() {
  // Morning - Club
  const { data: mcData, error: mcError } = await supabase
    .from('slots')
    .update({ start_time: '08:00:00', end_time: '09:40:00' })
    .eq('session', 'FORENOON')
    .not('club_id', 'is', null)
    .select();
  if (mcError) console.error('Error updating morning clubs:', mcError);
  else console.log(`Updated ${mcData.length} morning club slots.`);

  // Morning - Centre
  const { data: mceData, error: mceError } = await supabase
    .from('slots')
    .update({ start_time: '09:40:00', end_time: '10:30:00' })
    .eq('session', 'FORENOON')
    .not('centre_id', 'is', null)
    .select();
  if (mceError) console.error('Error updating morning centres:', mceError);
  else console.log(`Updated ${mceData.length} morning centre slots.`);

  // Evening - Centre
  const { data: eceData, error: eceError } = await supabase
    .from('slots')
    .update({ start_time: '13:10:00', end_time: '14:00:00' })
    .eq('session', 'AFTERNOON')
    .not('centre_id', 'is', null)
    .select();
  if (eceError) console.error('Error updating evening centres:', eceError);
  else console.log(`Updated ${eceData.length} evening centre slots.`);

  // Evening - Club
  const { data: ecData, error: ecError } = await supabase
    .from('slots')
    .update({ start_time: '14:00:00', end_time: '15:40:00' })
    .eq('session', 'AFTERNOON')
    .not('club_id', 'is', null)
    .select();
  if (ecError) console.error('Error updating evening clubs:', ecError);
  else console.log(`Updated ${ecData.length} evening club slots.`);
}
run();
