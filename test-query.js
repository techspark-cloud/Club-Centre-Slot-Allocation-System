const { createClient } = require('@supabase/supabase-js');
const supabase = createClient('https://kjestbshetpglycmmrem.supabase.co', 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtqZXN0YnNoZXRwZ2x5Y21tcmVtIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4NzA2MjIyNiwiZXhwIjoyMTAyNjM4MjI2fQ.tvbYzoSBKhJZgbBEwJSs2MhBRy4NAVtkKtyACdOlWmE');

async function run() {
  const { data } = await supabase
    .from('allocations')
    .select(`
      id,
      student:students ( id, name, register_no ),
      slot:slots!inner ( id, day, club_id )
    `)
    .eq('slot.club_id', '4bce0a0f-aa44-4cdf-b39b-a95331701a0e')
    .limit(2);
  console.log(JSON.stringify(data, null, 2));
}
run();
