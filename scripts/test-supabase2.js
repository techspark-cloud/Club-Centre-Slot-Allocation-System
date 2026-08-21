const { createClient } = require('@supabase/supabase-js');
const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
async function run() {
  const { data } = await supabase.from('students').select('allowed_day').limit(100);
  const uniqueDays = [...new Set(data.map(d => d.allowed_day))];
  console.log('Unique allowed_day values:', uniqueDays);
}
run();
