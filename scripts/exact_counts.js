const fs = require('fs');
const env = fs.readFileSync('.env.local', 'utf8').split('\n').reduce((acc, line) => {
  const [key, ...val] = line.split('=');
  if (key && val.length) acc[key.trim()] = val.join('=').trim().replace(/^['"]|['"]$/g, '');
  return acc;
}, {});

const { createClient } = require('@supabase/supabase-js');
const supabase = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);

async function exactCounts() {
  const { count: studentCount } = await supabase.from('students').select('*', { count: 'exact', head: true });
  const { count: allocCount } = await supabase.from('allocations').select('*', { count: 'exact', head: true });
  console.log('Exact student count in DB:', studentCount);
  console.log('Exact allocation count in DB:', allocCount);
}

exactCounts();
