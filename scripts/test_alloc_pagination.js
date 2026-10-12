const fs = require('fs');
const env = fs.readFileSync('.env.local', 'utf8').split('\n').reduce((acc, line) => {
  const [key, ...val] = line.split('=');
  if (key && val.length) acc[key.trim()] = val.join('=').trim().replace(/^['"]|['"]$/g, '');
  return acc;
}, {});

const { createClient } = require('@supabase/supabase-js');
const supabase = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);

async function testAllocPages() {
  let page = 0;
  let total = 0;
  while (true) {
    console.log(`Fetching page ${page}...`);
    const { data: batch, error: aErr } = await supabase
      .from('allocations')
      .select('id, student_id, slot_id')
      .range(page * 1000, (page + 1) * 1000 - 1);
    if (aErr) {
      console.error('Error fetching allocations page ' + page, aErr);
      break;
    }
    if (!batch || batch.length === 0) {
      console.log('Empty batch, done.');
      break;
    }
    total += batch.length;
    console.log(`Page ${page}: got ${batch.length} (total: ${total})`);
    if (batch.length < 1000) break;
    page++;
  }
}

testAllocPages();
