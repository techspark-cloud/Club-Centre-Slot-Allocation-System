const fs = require('fs');
const env = fs.readFileSync('.env.local', 'utf8').split('\n').reduce((acc, line) => {
  const [key, ...val] = line.split('=');
  if (key && val.length) acc[key.trim()] = val.join('=').trim().replace(/^['"]|['"]$/g, '');
  return acc;
}, {});

const { createClient } = require('@supabase/supabase-js');
const supabase = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);

async function checkDates() {
  // Check count of allocations grouped by date
  // Since we cannot group by date easily with REST, let's fetch created_at in chunks or range
  const { data: aug } = await supabase.from('allocations').select('id', { count: 'exact', head: true }).lt('created_at', '2026-09-01T00:00:00Z');
  const { count: augCount } = await supabase.from('allocations').select('*', { count: 'exact', head: true }).lt('created_at', '2026-09-01T00:00:00Z');
  const { count: octCount } = await supabase.from('allocations').select('*', { count: 'exact', head: true }).gte('created_at', '2026-10-01T00:00:00Z');
  console.log('Allocations in August 2026:', augCount);
  console.log('Allocations in October 2026:', octCount);
}

checkDates();
