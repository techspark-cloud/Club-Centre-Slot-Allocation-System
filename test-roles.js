const { createClient } = require('@supabase/supabase-js');
const supabase = createClient('https://kjestbshetpglycmmrem.supabase.co', 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtqZXN0YnNoZXRwZ2x5Y21tcmVtIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4NzA2MjIyNiwiZXhwIjoyMTAyNjM4MjI2fQ.tvbYzoSBKhJZgbBEwJSs2MhBRy4NAVtkKtyACdOlWmE');

async function run() {
  const { data } = await supabase.from('profiles').select('*').limit(5);
  console.log('Sample profiles:', data);
}
run();
