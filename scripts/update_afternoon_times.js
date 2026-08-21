const { createClient } = require('@supabase/supabase-js');
const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function run() {
  // Update Club slots for AFTERNOON to be late
  const { data: cData, error: cError } = await supabase
    .from('slots')
    .update({ start_time: '14:25:00', end_time: '15:40:00' })
    .eq('session', 'AFTERNOON')
    .not('club_id', 'is', null)
    .select();
  
  if (cError) {
    console.error('Error updating clubs:', cError);
  } else {
    console.log(`Updated ${cData.length} club slots for afternoon.`);
  }

  // Update Centre slots for AFTERNOON to be early
  const { data: ceData, error: ceError } = await supabase
    .from('slots')
    .update({ start_time: '13:10:00', end_time: '14:25:00' })
    .eq('session', 'AFTERNOON')
    .not('centre_id', 'is', null)
    .select();

  if (ceError) {
    console.error('Error updating centres:', ceError);
  } else {
    console.log(`Updated ${ceData.length} centre slots for afternoon.`);
  }
}
run();
