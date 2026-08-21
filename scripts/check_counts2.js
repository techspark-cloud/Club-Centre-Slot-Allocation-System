const { createClient } = require('@supabase/supabase-js');
const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function check() {
  const { data, error } = await supabase.from('slots').select('day, session, type, allocated_count').eq('status', 'ACTIVE');
  if (error) {
    console.error(error);
    return;
  }
  const totals = {};
  data.forEach(s => {
    const key = `${s.day}_${s.session}`;
    if (!totals[key]) totals[key] = 0;
    totals[key] += (s.allocated_count || 0);
  });
  console.log(totals);
}
check();
