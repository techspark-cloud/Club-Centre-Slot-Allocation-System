const { createClient } = require('@supabase/supabase-js');
const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);
async function run() {
  const { error } = await supabase.from('allocations').select('student_id, day, club:clubs(name), centre:centres(name), activity_pair:activity_pairs(venue)').limit(1);
  console.log(error);
}
run();
