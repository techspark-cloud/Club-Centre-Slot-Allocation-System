const { createClient } = require('@supabase/supabase-js');
const supabase = createClient('https://kjestbshetpglycmmrem.supabase.co', 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtqZXN0YnNoZXRwZ2x5Y21tcmVtIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4NzA2MjIyNiwiZXhwIjoyMTAyNjM4MjI2fQ.tvbYzoSBKhJZgbBEwJSs2MhBRy4NAVtkKtyACdOlWmE');

async function run() {
  const { data: clubs } = await supabase.from('clubs').select('id, name').limit(1);
  if (!clubs || clubs.length === 0) return console.log("No clubs found");
  const club = clubs[0];

  const { data: profiles } = await supabase.from('profiles').select('*').limit(5);
  
  console.log("Club:", club);
  console.log("Profiles:", profiles);
}
run();
