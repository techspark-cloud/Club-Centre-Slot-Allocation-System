const { createClient } = require('@supabase/supabase-js');
const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function fixSports() {
  const SPORTS_CENTRE_ID = 'eeac4ebc-10ef-4746-8d42-4ed4ff468e0e';
  
  const { data: slots, error } = await supabase
    .from('slots')
    .update({ capacity: 0 })
    .eq('centre_id', SPORTS_CENTRE_ID);
    
  if (error) {
    console.error("Error setting sports to 0:", error);
  } else {
    console.log("Successfully set all Sports centre slots back to 0 capacity.");
  }
}

fixSports();
