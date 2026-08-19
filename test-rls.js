const { createClient } = require('@supabase/supabase-js');
const supabase = createClient('https://kjestbshetpglycmmrem.supabase.co', 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtqZXN0YnNoZXRwZ2x5Y21tcmVtIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4NzA2MjIyNiwiZXhwIjoyMTAyNjM4MjI2fQ.tvbYzoSBKhJZgbBEwJSs2MhBRy4NAVtkKtyACdOlWmE');

async function run() {
  const { data, error } = await supabase.rpc('get_policies', {});
  // Actually, we can just query the pg_policies table if we have service_role
  const { data: policies, error: e2 } = await supabase.from('pg_policies').select('*').eq('tablename', 'allocations');
  if (e2) {
    // If not accessible via REST, let's just log
    console.log("Could not fetch pg_policies", e2);
  } else {
    console.log("Allocations Policies:", policies);
  }
}
run();
