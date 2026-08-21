const { createClient } = require('@supabase/supabase-js');
const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);

async function test() {
  const { data, error } = await supabase
    .from('allocations')
    .select(`
      id,
      created_at,
      students (name, register_no, course, gender, section, semester, contact_no),
      slots!inner (
        day, session, venue, start_time, end_time, club_id, centre_id,
        clubs (name),
        centres (name)
      )
    `)
    .not('slots.centre_id', 'is', null)
    .limit(5);

  console.log('Error:', error);
  console.log('Data length:', data ? data.length : 0);
  if (data && data.length > 0) console.log(data[0]);
}
test();
